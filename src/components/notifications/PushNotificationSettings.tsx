import { Bell, BellOff, BellRing, Loader2, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export function PushNotificationSettings() {
  const {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications();

  const handleRequestPermission = async () => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta notificações push');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        toast.success('Permissão concedida! Agora clique em "Ativar" para receber notificações.');
      } else if (result === 'denied') {
        toast.error('Permissão negada. Você pode alterar isso nas configurações do navegador.');
      } else {
        toast.info('Você fechou o prompt. Clique novamente para permitir notificações.');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Erro ao solicitar permissão');
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba notificações no seu dispositivo quando houver atualizações importantes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show activation prompt when not subscribed */}
        {!isSubscribed && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <BellRing className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Ative as notificações</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique no botão abaixo para ativar notificações push e receber alertas de tarefas e atualizações importantes.
                </p>
              </div>
            </div>
            <Button 
              onClick={subscribe}
              className="w-full"
              variant="default"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Ativar Notificações Push
            </Button>
          </div>
        )}

        {/* Subscription Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Status</p>
            <p className="text-sm text-muted-foreground">
              {permission === 'denied' 
                ? 'Notificações bloqueadas pelo navegador'
                : isSubscribed 
                  ? 'Notificações ativadas ✓'
                  : 'Notificações desativadas'}
            </p>
          </div>
          
          {isSubscribed && (
            <Button
              variant="outline"
              onClick={unsubscribe}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BellOff className="h-4 w-4 mr-2" />
              )}
              Desativar
            </Button>
          )}
        </div>

        {isSubscribed && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={sendTestNotification}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Enviar notificação de teste
            </Button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="p-3 bg-destructive/10 rounded-md text-sm space-y-2">
            <p className="text-destructive font-medium">
              Notificações bloqueadas
            </p>
            <p className="text-muted-foreground">
              Para liberar as notificações:
            </p>
            <div className="text-muted-foreground space-y-3 text-xs">
              <div>
                <p className="font-medium text-foreground mb-1">💻 No computador:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Chrome/Edge:</strong> Clique no ícone à esquerda da URL → Permissões → Notificações → Permitir</li>
                  <li><strong>Firefox:</strong> Clique no cadeado → Conexão segura → Permissões</li>
                  <li><strong>Safari:</strong> Safari → Preferências → Sites → Notificações</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">📱 No celular Android:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Toque no ícone de cadeado/info na barra de endereço</li>
                  <li>Toque em "Permissões" ou "Configurações do site"</li>
                  <li>Ative "Notificações"</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">🍎 No iPhone (iOS 16.4+):</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Primeiro, adicione o app à tela inicial (Compartilhar → Adicionar à Tela de Início)</li>
                  <li>Abra o app pela tela inicial</li>
                  <li>Vá em Ajustes → Notificações → [Nome do App] → Permitir</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              Após liberar, recarregue a página e clique em "Ativar Notificações Push" novamente.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
