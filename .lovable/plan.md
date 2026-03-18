

## Gloss — MVP de Gestão para Estéticas Automotivas

### Visão Geral
App SaaS multi-tenant com design industrial de alto contraste, otimizado para uso mobile com uma mão em ambiente de oficina. Backend via Lovable Cloud (Supabase).

---

### 1. Banco de Dados (Supabase)

**Tabelas:**
- **shops** — id, name, created_at
- **profiles** — id (FK auth.users), shop_id (FK shops), full_name, phone, created_at
- **user_roles** — id, user_id (FK auth.users), role (enum: owner, employee)
- **services** — id, shop_id, name, price, duration_minutes, active
- **customers** — id, shop_id, name, phone, email
- **vehicles** — id, shop_id, customer_id (FK), plate (text), model
- **jobs** — id, shop_id, vehicle_id (FK), service_id (FK), status (enum: waiting, in_progress, done), entry_photo_url, notes, started_at, finished_at, created_by, created_at

**Segurança:**
- RLS em todas as tabelas filtrando por shop_id do usuário autenticado
- Função `has_role()` (security definer) para verificar roles sem recursão
- Enum `app_role` para owner/employee

---

### 2. Autenticação

- Login por email/senha com persistência de sessão
- Registro inicial: OWNER cria conta → cria loja automaticamente
- Tela de login com design industrial (dark, alto contraste)
- Redirect baseado em role: OWNER → Dashboard, EMPLOYEE → Lista de Jobs
- Logout acessível nas configurações

---

### 3. Telas e Funcionalidades

**Login/Registro**
- Formulário minimalista, campos grandes (48px touch targets)
- Validação inline

**Dashboard (OWNER)**
- Resumo: veículos no pátio, jobs pendentes, concluídos hoje
- Acesso rápido a "Novo Check-in"

**Lista de Veículos/Jobs (ambos roles)**
- Cards densos com placa em destaque (font-mono, text-2xl)
- Badges de status: Amarelo (Aguardando), Azul (Em Processo), Verde (Concluído)
- Filtro por status
- Tap no card → detalhes + ações

**Check-in (botão "+")**
1. Input de placa (uppercase, font-mono)
2. Modelo do veículo
3. Selecionar/criar cliente (nome, telefone)
4. Selecionar serviço
5. Foto de entrada (câmera do dispositivo)
6. Salvar

**Gestão de Status**
- Tap no card para mudar status: Aguardando → Em Processo → Concluído
- Registro automático de timestamps

**Cadastro de Serviços (OWNER)**
- CRUD de serviços com nome, preço e duração
- Preços em formato tabular-nums

**Gestão de Funcionários (OWNER)**
- Listar funcionários da loja
- Criar conta de funcionário (email, nome, senha temporária)
- Remover funcionário

**Cadastro de Clientes**
- Nome, telefone, e-mail
- Vinculado à loja
- Pesquisa rápida no check-in

**Configurações**
- Dados da loja
- Logout

---

### 4. Navegação

- Bottom Bar fixa (mobile-first): Início, Veículos, Configurações
- OWNER vê itens extras: Serviços, Equipe

---

### 5. Design System (Gloss)

- Tema dark industrial com as cores do brief (Deep Charcoal, Electric Blue, Safety Yellow)
- Geist Sans como fonte principal
- Touch targets mínimos de 48px
- Cards com `border border-border bg-secondary rounded-md`
- Botões primários: `h-12 w-full bg-primary uppercase tracking-wider font-bold`
- Animações com Framer Motion: `whileTap={{ scale: 0.97 }}`, transições de 150ms
- Sem glassmorphism, sem pills, sem scroll infinito, sem pastel

