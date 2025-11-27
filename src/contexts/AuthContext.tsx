import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Get published app URL - ALWAYS use production URL
      const hostname = window.location.hostname;
      let redirectUrl;

      if (hostname.includes('lovableproject.com') || hostname.includes('lovable.app')) {
        // Lovable hosted environment - always construct production URL
        const parts = hostname.split('.');
        const projectId = parts[0].replace(/^(edit-|preview-)/, '');
        redirectUrl = `https://${projectId}.lovableproject.com/`;
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // For localhost, we cannot determine production URL automatically
        throw new Error("Cadastro deve ser feito a partir do app publicado, não de localhost. Por favor, acesse seu app publicado.");
      } else {
        // Custom domain
        redirectUrl = `${window.location.origin}/`;
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      
      toast.success("Conta criada com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success("Login realizado com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer logout");
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Get published app URL - ALWAYS use production URL
      const hostname = window.location.hostname;
      let redirectUrl;

      if (hostname.includes('lovableproject.com') || hostname.includes('lovable.app')) {
        // Lovable hosted environment - always construct production URL
        const parts = hostname.split('.');
        const projectId = parts[0].replace(/^(edit-|preview-)/, '');
        redirectUrl = `https://${projectId}.lovableproject.com/reset-password`;
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // For localhost, we cannot determine production URL automatically
        throw new Error("Recuperação de senha deve ser feita a partir do app publicado, não de localhost. Por favor, acesse seu app publicado.");
      } else {
        // Custom domain
        redirectUrl = `${window.location.origin}/reset-password`;
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      
      toast.success("Senha atualizada com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar senha");
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};