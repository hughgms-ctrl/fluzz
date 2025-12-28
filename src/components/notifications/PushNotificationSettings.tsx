import { Bell, BellOff, Loader2, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';

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
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Status</p>
            <p className="text-sm text-muted-foreground">
              {permission === 'denied' 
                ? 'Notificações bloqueadas pelo navegador'
                : isSubscribed 
                  ? 'Notificações ativadas'
                  : 'Notificações desativadas'}
            </p>
          </div>
          
          {permission !== 'denied' && (
            <Button
              variant={isSubscribed ? 'outline' : 'default'}
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isSubscribed ? (
                <BellOff className="h-4 w-4 mr-2" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              {isSubscribed ? 'Desativar' : 'Ativar'}
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
          <div className="p-3 bg-destructive/10 rounded-md text-sm">
            <p className="text-destructive">
              As notificações foram bloqueadas. Para ativá-las, clique no ícone de cadeado 
              na barra de endereços do navegador e permita notificações.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
