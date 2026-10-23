import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, MessageSquare, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { conversationRequestsQuery, requestMessagesQuery, sendRequestMessage } from "@/lib/queries";
import { requestStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mensagens")({
  validateSearch: (search: Record<string, unknown>) => ({
    pedido: typeof search["pedido"] === "string" ? search["pedido"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Mensagens · Casa Diária" },
      { name: "description", content: "Converse sobre seus pedidos de serviço na Casa Diária." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user, loading } = useAuth();
  const search = useSearch({ from: "/mensagens" });
  const navigate = useNavigate({ from: "/mensagens" });
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [mobileListOpen, setMobileListOpen] = useState(!search.pedido);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    data: requests = [],
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsErrorDetails,
  } = useQuery({
    ...conversationRequestsQuery(user?.id ?? ""),
    enabled: !!user,
  });
  const selectedRequest = requests.find((request) => request.id === search.pedido) ?? requests[0];
  const selectedRequestId = selectedRequest?.id ?? "";

  useEffect(() => {
    const firstRequestId = requests[0]?.id;
    if (firstRequestId && !requests.some((request) => request.id === search.pedido)) {
      void navigate({
        to: "/mensagens",
        search: { pedido: firstRequestId },
        replace: true,
      });
    }
  }, [navigate, requests, search.pedido]);

  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError: messagesError,
    error: messagesErrorDetails,
  } = useQuery({
    ...requestMessagesQuery(selectedRequestId),
    enabled: !!user && !!selectedRequestId,
    refetchInterval: 5_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedRequestId]);

  const sendMessage = useMutation({
    mutationFn: (payload: {
      body: string;
      location?: { latitude: number; longitude: number; accuracyMeters: number | null };
    }) => {
      if (!user || !selectedRequestId) throw new Error("Selecione um pedido para enviar mensagem.");
      return sendRequestMessage(selectedRequestId, user.id, payload.body, payload.location);
    },
    onSuccess: async (_data, variables) => {
      if (!variables.location) setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["request-messages", selectedRequestId] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || draft.trim().length > 4000 || sendMessage.isPending) return;
    sendMessage.mutate({ body: draft.trim() });
  }

  async function handleShareLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Este navegador não oferece suporte à localização.");
      return;
    }
    if (!window.isSecureContext) {
      setLocationError("A localização exige uma conexão segura (HTTPS).");
      return;
    }

    setIsLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 0,
        });
      });
      sendMessage.mutate({
        body: "Localização compartilhada",
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
        },
      });
    } catch (error) {
      if (error instanceof GeolocationPositionError) {
        const reason =
          error.code === 1
            ? "Permissão de localização negada. Autorize o acesso no navegador para compartilhar."
            : error.code === 2
              ? "Não foi possível determinar sua localização. Verifique o GPS ou tente novamente."
              : "A localização demorou demais. Tente novamente.";
        setLocationError(reason);
      } else {
        setLocationError("Não foi possível obter sua localização. Tente novamente.");
      }
    } finally {
      setIsLocating(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="h-[70vh] animate-pulse rounded-3xl bg-muted" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <MessageSquare className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h1 className="font-display text-2xl font-semibold">Entre para acessar suas mensagens</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            As conversas ficam disponíveis para clientes e profissionais participantes do pedido.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Mensagens</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Converse com segurança sobre cada pedido de serviço.
          </p>
        </div>

        <div className="grid min-h-[65vh] overflow-hidden rounded-3xl border bg-card shadow-sm md:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={cn("border-r", !mobileListOpen && "hidden md:block")}>
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Seus pedidos</h2>
              <p className="text-xs text-muted-foreground">
                {requests.length} {requests.length === 1 ? "conversa" : "conversas"}
              </p>
            </div>
            {requestsLoading ? (
              <div className="space-y-3 p-4">
                <div className="h-16 animate-pulse rounded-2xl bg-muted" />
                <div className="h-16 animate-pulse rounded-2xl bg-muted" />
              </div>
            ) : requestsError ? (
              <p className="p-4 text-sm text-destructive">
                Não foi possível carregar as conversas: {requestsErrorDetails.message}
              </p>
            ) : requests.length === 0 ? (
              <div className="p-5 text-center">
                <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Nenhum pedido para conversar</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quando você pedir um orçamento ou receber um pedido, a conversa aparecerá aqui.
                </p>
                <Button asChild variant="outline" className="mt-4 rounded-full">
                  <Link to="/buscar">Buscar profissionais</Link>
                </Button>
              </div>
            ) : (
              <ul className="max-h-[65vh] overflow-y-auto p-2">
                {requests.map((request) => {
                  const professional = request.professionals;
                  const isClient = request.client_id === user.id;
                  const otherName = isClient
                    ? professional?.business_name || professional?.name || "Profissional"
                    : request.client_name || "Cliente";
                  return (
                    <li key={request.id}>
                      <Link
                        to="/mensagens"
                        search={{ pedido: request.id }}
                        onClick={() => setMobileListOpen(false)}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl p-3 transition hover:bg-muted/70",
                          selectedRequestId === request.id && "bg-primary-soft",
                        )}
                      >
                        <Avatar
                          src={isClient ? professional?.avatar_url : null}
                          name={otherName}
                          className="h-11 w-11 shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{otherName}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {request.description}
                          </span>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            Pedido {requestStatusLabel[request.status] ?? request.status}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <div
            className={cn(
              "flex min-h-[65vh] flex-col",
              mobileListOpen && "hidden md:flex",
              !selectedRequest && "hidden md:flex",
            )}
          >
            {selectedRequest ? (
              <>
                <header className="flex items-center gap-3 border-b px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Voltar para conversas"
                    onClick={() => setMobileListOpen(true)}
                  >
                    <ArrowLeft />
                  </Button>
                  <Avatar
                    src={
                      selectedRequest.client_id === user.id
                        ? selectedRequest.professionals?.avatar_url
                        : null
                    }
                    name={
                      selectedRequest.client_id === user.id
                        ? selectedRequest.professionals?.business_name ||
                          selectedRequest.professionals?.name ||
                          "Profissional"
                        : selectedRequest.client_name || "Cliente"
                    }
                    className="h-10 w-10 shrink-0"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">
                      {selectedRequest.client_id === user.id
                        ? selectedRequest.professionals?.business_name ||
                          selectedRequest.professionals?.name ||
                          "Profissional"
                        : selectedRequest.client_name || "Cliente"}
                    </h2>
                    <p className="truncate text-xs text-muted-foreground">
                      Pedido: {selectedRequest.description}
                    </p>
                  </div>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
                  {messagesLoading ? (
                    <div className="space-y-3">
                      <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-muted" />
                      <div className="ml-auto h-12 w-2/3 animate-pulse rounded-2xl bg-muted" />
                    </div>
                  ) : messagesError ? (
                    <p
                      role="alert"
                      className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      Não foi possível carregar as mensagens: {messagesErrorDetails.message}
                    </p>
                  ) : messages.length === 0 ? (
                    <div className="grid h-full min-h-48 place-content-center text-center">
                      <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="font-medium">Inicie a conversa</p>
                      <p className="text-sm text-muted-foreground">
                        Combine detalhes do serviço diretamente por aqui.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const ownMessage = message.sender_id === user.id;
                      const latitude = message.location_latitude;
                      const longitude = message.location_longitude;
                      const mapUrl =
                        latitude !== null && longitude !== null
                          ? `https://www.google.com/maps?q=${latitude},${longitude}`
                          : null;
                      return (
                        <div
                          key={message.id}
                          className={cn("flex", ownMessage ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[70%]",
                              ownMessage
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md border bg-card",
                            )}
                          >
                            {latitude !== null && longitude !== null && mapUrl ? (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block min-w-52 rounded-xl border border-current/15 p-3 hover:bg-black/5"
                              >
                                <span className="flex items-center gap-2 font-semibold">
                                  <MapPin className="h-4 w-4 shrink-0" />
                                  Localização compartilhada
                                </span>
                                <span className="mt-1 block text-xs opacity-80">
                                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                                </span>
                                {message.location_accuracy_meters !== null && (
                                  <span className="mt-1 block text-xs opacity-80">
                                    Precisão aproximada:{" "}
                                    {Math.round(message.location_accuracy_meters)} m
                                  </span>
                                )}
                                <span className="mt-2 block text-xs underline">
                                  Abrir no Google Maps
                                </span>
                              </a>
                            ) : (
                              <p className="whitespace-pre-wrap break-words text-sm">
                                {message.body}
                              </p>
                            )}
                            <time
                              dateTime={message.created_at}
                              className={cn(
                                "mt-1 block text-right text-[10px]",
                                ownMessage ? "text-primary-foreground/75" : "text-muted-foreground",
                              )}
                            >
                              {new Date(message.created_at).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </time>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={handleSubmit} className="border-t bg-card p-3">
                  {sendMessage.isError && (
                    <p role="alert" className="mb-2 text-sm text-destructive">
                      Não foi possível enviar a mensagem: {sendMessage.error.message}
                    </p>
                  )}
                  {locationError && (
                    <p role="alert" className="mb-2 text-sm text-destructive">
                      {locationError}
                    </p>
                  )}
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-full"
                      aria-label="Compartilhar minha localização atual"
                      title="Compartilhar localização atual"
                      onClick={handleShareLocation}
                      disabled={isLocating || sendMessage.isPending}
                    >
                      <MapPin className={cn(isLocating && "animate-pulse")} />
                    </Button>
                    <Textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Escreva sua mensagem..."
                      aria-label="Mensagem"
                      maxLength={4000}
                      rows={2}
                      className="max-h-32 min-h-11 resize-y rounded-2xl text-sm"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-full"
                      aria-label="Enviar mensagem"
                      disabled={!draft.trim() || draft.length > 4000 || sendMessage.isPending}
                    >
                      <Send />
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    A localização só é obtida ao tocar no alfinete e, quando enviada, fica salva
                    nesta conversa para os participantes do pedido.
                  </p>
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">
                    {draft.length}/4000
                  </p>
                </form>
              </>
            ) : (
              <div className="grid flex-1 place-content-center p-6 text-center">
                <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Selecione uma conversa</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Escolha um pedido na lista para ver as mensagens.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
