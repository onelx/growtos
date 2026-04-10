# GrowtOS - Marketing Campaign Builder con AI

Plataforma de generación de campañas de marketing completas mediante colaboración con agentes de IA especializados.

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router) + TypeScript 5.x + Tailwind CSS
- **Backend**: Next.js API Routes con Edge Runtime
- **IA**: Anthropic Claude API
- **Base de Datos**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel
- **Estado**: Zustand 4.x

## Características Principales

- 🤖 Sistema multi-agente (Estratega, Investigador, Copywriter)
- 💬 Chat interactivo con streaming de respuestas
- 🎯 Quality gates entre etapas de agentes
- 📊 ADN de campaña acumulativo
- 💳 Sistema de créditos para gestión de costos
- 🔐 Autenticación con Supabase (Magic Link + OAuth)

## Setup Local

### Prerequisitos

- Node.js 18+ y npm
- Cuenta en Supabase (https://supabase.com)
- API Key de Anthropic (https://console.anthropic.com)

### Instalación

1. **Clonar el repositorio**

```bash
git clone <tu-repo>
cd growtos
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Copiá `.env.example` a `.env.local` y completá con tus credenciales:

```bash
cp .env.example .env.local
```

Editá `.env.local` con:

- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon key de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key de Supabase
- `ANTHROPIC_API_KEY`: Tu API key de Claude
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000` en desarrollo

4. **Configurar Supabase**

Ejecutá el siguiente SQL en el SQL Editor de Supabase:

```sql
-- Crear tabla de usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  plan TEXT DEFAULT 'free',
  credits_balance INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de campañas
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'intake',
  intake_data JSONB NOT NULL,
  campaign_dna JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de outputs de agentes
CREATE TABLE agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  input_context JSONB NOT NULL,
  output_content JSONB NOT NULL,
  quality_score NUMERIC(3,2),
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de mensajes de chat
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_output_id UUID REFERENCES agent_outputs(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de transacciones de créditos
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear índices
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_agent_outputs_campaign_id ON agent_outputs(campaign_id);
CREATE INDEX idx_chat_messages_agent_output_id ON chat_messages(agent_output_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);

-- Habilitar Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Políticas RLS para campaigns
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
  ON campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para agent_outputs
CREATE POLICY "Users can view own agent outputs"
  ON agent_outputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = agent_outputs.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Políticas RLS para chat_messages
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_outputs
      JOIN campaigns ON campaigns.id = agent_outputs.campaign_id
      WHERE agent_outputs.id = chat_messages.agent_output_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Políticas RLS para credit_transactions
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Función para crear usuario al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

5. **Iniciar servidor de desarrollo**

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

## Deploy en Vercel

1. **Push a GitHub**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Conectar con Vercel**

- Ingresá a [vercel.com](https://vercel.com)
- Importá tu repositorio
- Configurá las variables de entorno desde `.env.local`
- Deploy automático

3. **Configurar variables de entorno en Vercel**

En Settings > Environment Variables, agregá todas las variables de `.env.local` excepto cambiar:

- `NEXT_PUBLIC_APP_URL`: Tu URL de producción (ej: `https://tu-app.vercel.app`)

4. **Configurar callback URL en Supabase**

En Supabase Dashboard > Authentication > URL Configuration, agregá:

- Site URL: `https://tu-app.vercel.app`
- Redirect URLs: `https://tu-app.vercel.app/api/auth/callback`

## Estructura del Proyecto

```
growtos/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas públicas de autenticación
│   ├── (dashboard)/       # Rutas protegidas del dashboard
│   ├── api/               # API Routes
│   ├── globals.css        # Estilos globales
│   └── layout.tsx         # Layout raíz
├── components/            # Componentes React reutilizables
├── lib/                   # Utilidades y configuración
├── types/                 # Definiciones de TypeScript
├── public/                # Assets estáticos
└── hooks/                 # Custom React hooks
```

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Genera build de producción
- `npm run start` - Inicia servidor de producción
- `npm run lint` - Ejecuta ESLint

## Licencia

Privado - Todos los derechos reservados
