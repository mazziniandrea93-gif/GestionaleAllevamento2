from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import ListFlowable, ListItem

OUTPUT = "Documentazione_AllevamentoManager.pdf"

# ── Colori brand ──────────────────────────────────────────────────────────────
YELLOW      = colors.HexColor("#F59E0B")
YELLOW_LIGHT= colors.HexColor("#FEF3C7")
DARK        = colors.HexColor("#111827")
GRAY        = colors.HexColor("#6B7280")
GRAY_LIGHT  = colors.HexColor("#F9FAFB")
BLUE        = colors.HexColor("#3B82F6")
GREEN       = colors.HexColor("#10B981")
PURPLE      = colors.HexColor("#8B5CF6")
RED         = colors.HexColor("#EF4444")
WHITE       = colors.white

W, H = A4

# ── Stili ─────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def style(name, parent='Normal', **kw):
    s = ParagraphStyle(name, parent=base[parent], **kw)
    return s

S = {
    'cover_title':  style('cover_title',  'Title',   fontSize=36, textColor=WHITE,   alignment=TA_CENTER, leading=44, fontName='Helvetica-Bold'),
    'cover_sub':    style('cover_sub',    'Normal',  fontSize=14, textColor=YELLOW_LIGHT, alignment=TA_CENTER, leading=20),
    'cover_info':   style('cover_info',   'Normal',  fontSize=10, textColor=WHITE,    alignment=TA_CENTER, spaceAfter=6),
    'h1':           style('h1',           'Heading1', fontSize=22, textColor=DARK,    fontName='Helvetica-Bold', spaceBefore=18, spaceAfter=8, leading=28),
    'h2':           style('h2',           'Heading2', fontSize=15, textColor=YELLOW,  fontName='Helvetica-Bold', spaceBefore=14, spaceAfter=6, leading=20),
    'h3':           style('h3',           'Normal',  fontSize=12, textColor=DARK,    fontName='Helvetica-Bold', spaceBefore=10, spaceAfter=4, leading=16),
    'body':         style('body',         'Normal',  fontSize=9.5, textColor=DARK,   leading=15, spaceAfter=4, alignment=TA_JUSTIFY),
    'code':         style('code',         'Code',    fontSize=8.5, fontName='Courier', backColor=GRAY_LIGHT, leftIndent=10, rightIndent=10, leading=13),
    'bullet':       style('bullet',       'Normal',  fontSize=9.5, textColor=DARK,   leading=14, leftIndent=12),
    'caption':      style('caption',      'Normal',  fontSize=8,   textColor=GRAY,   spaceAfter=8, alignment=TA_CENTER),
    'tag_yellow':   style('tag_yellow',   'Normal',  fontSize=8.5, textColor=colors.HexColor("#92400E"), backColor=YELLOW_LIGHT, fontName='Helvetica-Bold'),
    'tag_blue':     style('tag_blue',     'Normal',  fontSize=8.5, textColor=colors.HexColor("#1E40AF"), backColor=colors.HexColor("#DBEAFE"), fontName='Helvetica-Bold'),
    'tag_green':    style('tag_green',    'Normal',  fontSize=8.5, textColor=colors.HexColor("#065F46"), backColor=colors.HexColor("#D1FAE5"), fontName='Helvetica-Bold'),
    'table_header': style('table_header','Normal',   fontSize=9, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_CENTER),
    'table_cell':   style('table_cell',  'Normal',   fontSize=9, textColor=DARK, leading=13),
    'table_cell_c': style('table_cell_c','Normal',   fontSize=9, textColor=DARK, leading=13, alignment=TA_CENTER),
    'footer':       style('footer',      'Normal',   fontSize=8, textColor=GRAY, alignment=TA_CENTER),
}

def hr(color=YELLOW, thickness=1.5, space=8):
    return HRFlowable(width='100%', thickness=thickness, color=color, spaceAfter=space, spaceBefore=space)

def h1(text): return Paragraph(text, S['h1'])
def h2(text): return Paragraph(text, S['h2'])
def h3(text): return Paragraph(text, S['h3'])
def p(text):  return Paragraph(text, S['body'])
def sp(n=1):  return Spacer(1, n * 0.35 * cm)
def code(text): return Paragraph(text.replace('\n','<br/>').replace(' ','&nbsp;'), S['code'])

def bullets(items, color=YELLOW):
    return ListFlowable(
        [ListItem(Paragraph(i, S['bullet']), bulletColor=color, leftIndent=16) for i in items],
        bulletType='bullet', leftIndent=10
    )

def badge_row(items):
    cells = [Paragraph(f'&nbsp;{t}&nbsp;', S['tag_yellow']) for t in items]
    t = Table([cells], colWidths=[3.2*cm]*len(cells))
    t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [4,4,4,4]),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    return t

def info_table(rows, col1=5*cm, col2=None):
    col2 = col2 or (W - 4*cm - col1)
    data = [[Paragraph(f'<b>{k}</b>', S['table_cell']), Paragraph(v, S['table_cell'])] for k, v in rows]
    t = Table(data, colWidths=[col1, col2])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), GRAY_LIGHT),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    return t

def section_table(headers, rows, col_widths=None):
    header_row = [Paragraph(h, S['table_header']) for h in headers]
    data_rows = [[Paragraph(str(c), S['table_cell']) for c in row] for row in rows]
    all_data = [header_row] + data_rows
    n = len(headers)
    if col_widths is None:
        col_widths = [(W - 4*cm) / n] * n
    t = Table(all_data, colWidths=col_widths, repeatRows=1)
    ts = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ])
    for i in range(1, len(all_data)):
        bg = WHITE if i % 2 == 0 else GRAY_LIGHT
        ts.add('BACKGROUND', (0, i), (-1, i), bg)
    t.setStyle(ts)
    return t

# ══════════════════════════════════════════════════════════════════════════════
# COVER PAGE (disegnata via canvas callback)
# ══════════════════════════════════════════════════════════════════════════════

def cover_canvas(canvas, doc):
    canvas.saveState()
    # sfondo scuro
    canvas.setFillColor(DARK)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # banda gialla in alto
    canvas.setFillColor(YELLOW)
    canvas.rect(0, H - 3.5*cm, W, 3.5*cm, fill=1, stroke=0)
    # cerchio decorativo
    canvas.setFillColor(colors.HexColor("#1F2937"))
    canvas.circle(W + 1*cm, 3*cm, 8*cm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#374151"))
    canvas.circle(-1*cm, H - 1*cm, 6*cm, fill=1, stroke=0)
    canvas.restoreState()

def footer_canvas(canvas, doc):
    if doc.page == 1:
        return
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#F3F4F6"))
    canvas.rect(0, 0, W, 1.2*cm, fill=1, stroke=0)
    canvas.setFillColor(YELLOW)
    canvas.rect(0, 1.2*cm - 2, W, 2, fill=1, stroke=0)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(2*cm, 0.45*cm, "Allevamento Manager — Documentazione Tecnica")
    canvas.drawRightString(W - 2*cm, 0.45*cm, f"Pagina {doc.page}")
    canvas.restoreState()

def on_page(canvas, doc):
    cover_canvas(canvas, doc) if doc.page == 1 else None
    footer_canvas(canvas, doc)

# ══════════════════════════════════════════════════════════════════════════════
# CONTENUTO
# ══════════════════════════════════════════════════════════════════════════════

story = []

# ── COVER ────────────────────────────────────────────────────────────────────
story.append(Spacer(1, 4.5*cm))
story.append(Paragraph("ALLEVAMENTO", style('ct1','Normal', fontSize=42, textColor=YELLOW, alignment=TA_CENTER, fontName='Helvetica-Bold')))
story.append(Paragraph("MANAGER", style('ct2','Normal', fontSize=52, textColor=WHITE, alignment=TA_CENTER, fontName='Helvetica-Bold', leading=58)))
story.append(Spacer(1, 0.6*cm))
story.append(Paragraph("Documentazione Tecnica Completa", S['cover_sub']))
story.append(Spacer(1, 1.2*cm))
story.append(hr(YELLOW, 1, 12))
story.append(Spacer(1, 0.8*cm))
story.append(Paragraph("Versione 1.0  ·  Aprile 2026", S['cover_info']))
story.append(Paragraph("React 18  ·  Supabase  ·  TailwindCSS", S['cover_info']))
story.append(PageBreak())

# ── 1. PANORAMICA ─────────────────────────────────────────────────────────────
story += [
    h1("1. Panoramica del Progetto"),
    hr(),
    p("Allevamento Manager è una <b>Progressive Web App (PWA)</b> pensata per allevatori professionali. "
      "Consente di gestire in modo centralizzato cani, cuccioli, accoppiamenti, finanze, salute, "
      "calendario eventi ed esposizioni, con dati sincronizzati in cloud tramite Supabase."),
    sp(),
    info_table([
        ("Tipologia",    "Progressive Web App (PWA)"),
        ("Framework",    "React 18.2 + Vite 7.3"),
        ("Backend",      "Supabase (PostgreSQL + Auth + Storage)"),
        ("Styling",      "TailwindCSS 3.4"),
        ("Data layer",   "TanStack React Query 5 + Zustand 4"),
        ("Deploy target","Browser moderni (ES2020+), installabile su mobile"),
    ]),
    sp(2),
]

# ── 2. STACK TECNOLOGICO ──────────────────────────────────────────────────────
story += [
    h1("2. Stack Tecnologico"),
    hr(),
    h2("2.1 Dipendenze Principali"),
    section_table(
        ["Pacchetto", "Versione", "Ruolo"],
        [
            ["react + react-dom",    "18.2.0",  "Framework UI"],
            ["react-router-dom",     "6.21.1",  "Routing SPA"],
            ["@tanstack/react-query","5.17.9",  "Server state & caching"],
            ["zustand",              "4.4.7",   "Client state globale"],
            ["@supabase/supabase-js","2.39.0",  "Backend BaaS"],
            ["react-hook-form",      "7.49.3",  "Gestione form"],
            ["zod",                  "3.22.4",  "Validazione schema"],
            ["tailwindcss",          "3.4.1",   "Utility CSS"],
            ["lucide-react",         "0.303.0", "Icon library"],
            ["react-hot-toast",      "2.4.1",   "Notifiche toast"],
            ["date-fns",             "3.0.6",   "Manipolazione date"],
            ["recharts",             "2.15.4",  "Grafici"],
            ["jsPDF + html2canvas",  "4.2 / 1.4","Export PDF"],
            ["vite",                 "7.3.1",   "Build tool"],
            ["vite-plugin-pwa",      "1.2.0",   "PWA support"],
        ],
        col_widths=[5.5*cm, 2.5*cm, 8.5*cm]
    ),
    sp(2),
    h2("2.2 Variabili d'Ambiente"),
    code("VITE_SUPABASE_URL=https://[project-id].supabase.co\nVITE_SUPABASE_ANON_KEY=ey..."),
    sp(),
    h2("2.3 Script NPM"),
    section_table(
        ["Comando", "Descrizione"],
        [
            ["npm run dev",     "Avvia server di sviluppo con hot-reload"],
            ["npm run build",   "Build produzione in dist/"],
            ["npm run preview", "Preview build produzione in locale"],
            ["npm run lint",    "Analisi statica con ESLint"],
        ],
        col_widths=[5*cm, 11.5*cm]
    ),
    sp(2),
]

# ── 3. STRUTTURA PROGETTO ─────────────────────────────────────────────────────
story += [
    h1("3. Struttura del Progetto"),
    hr(),
    code(
        "src/\n"
        "  pages/           # Pagine applicazione (una per route)\n"
        "  components/      # Componenti riutilizzabili\n"
        "    layout/        #   Header, Sidebar, Layout wrapper\n"
        "    dogs/          #   Card, Form, PDF, Misurazioni, Grafico\n"
        "    breeding/      #   LitterCard/Form, MatingCard/Form\n"
        "    puppies/       #   PuppyCard, PuppyForm\n"
        "    finance/       #   TransactionCard, TransactionForm\n"
        "    health/        #   HealthRecordCard, HealthRecordForm\n"
        "    calendar/      #   EventForm, EventCard\n"
        "  contexts/        # AuthContext\n"
        "  hooks/           # useNotifications\n"
        "  lib/\n"
        "    supabase.js    # Client Supabase + tutte le funzioni DB\n"
        "  App.jsx          # Root component + definizione rotte\n"
        "  main.jsx         # Entry point"
    ),
    sp(2),
]

# ── 4. ROUTING ────────────────────────────────────────────────────────────────
story += [
    h1("4. Routing e Navigazione"),
    hr(),
    p("Il routing è gestito da <b>React Router DOM v6</b>. Tutte le rotte (tranne <i>/auth</i>) "
      "sono protette da <b>ProtectedRoute</b>, che verifica la sessione tramite AuthContext e "
      "reindirizza a <i>/auth</i> se l'utente non è autenticato."),
    sp(),
    section_table(
        ["Percorso", "Componente", "Protezione", "Descrizione"],
        [
            ["/auth",         "Auth.jsx",       "Pubblica",    "Login / Registrazione / Reset password"],
            ["/dashboard",    "Dashboard.jsx",  "Privata",     "Panoramica allevamento"],
            ["/dogs",         "Dogs.jsx",       "Privata",     "Lista e filtro cani"],
            ["/dogs/:id",     "DogDetail.jsx",  "Privata",     "Dettaglio cane con tab"],
            ["/breeding",     "Breeding.jsx",   "Privata",     "Accoppiamenti e cucciolate"],
            ["/puppies",      "Puppies.jsx",    "Privata",     "Gestione cuccioli"],
            ["/finance",      "Finance.jsx",    "Privata",     "Entrate e uscite annuali"],
            ["/health",       "Health.jsx",     "Privata",     "Registro sanitario"],
            ["/calendar",     "Calendar.jsx",   "Privata",     "Calendario eventi"],
            ["/judges",       "Judges.jsx",     "Privata",     "Giudici ed esposizioni"],
            ["/settings",     "Settings.jsx",   "Privata",     "Preferenze e profilo"],
        ],
        col_widths=[3.5*cm, 4*cm, 2.5*cm, 6.5*cm]
    ),
    sp(2),
    h2("4.1 Configurazione React Query"),
    p("Il <b>QueryClient</b> è configurato con:"),
    bullets([
        "<b>staleTime:</b> 5 minuti — i dati non vengono refetchati per 5 min",
        "<b>refetchOnWindowFocus:</b> false — nessun refetch automatico al focus",
    ]),
    sp(2),
]

# ── 5. PAGINE ─────────────────────────────────────────────────────────────────
story += [
    h1("5. Pagine dell'Applicazione"),
    hr(),
]

pages_data = [
    (
        "5.1 Dashboard",
        "Homepage post-login con panoramica dell'allevamento.",
        ["4 stat card: Cani Attivi, Cuccioli Disponibili, Incassi Annuali, Spese Annuali",
         "Bilancio annuale con indicatore profit/loss",
         "Sezione «Prossimi Eventi» (5 eventi non completati)",
         "Sezione «Transazioni Recenti» (mese corrente)",
         "Modal inline per modifica evento e transazione"]
    ),
    (
        "5.2 Dogs — Lista Cani",
        "Gestione della lista completa dei cani dell'allevamento.",
        ["Ricerca full-text per nome, razza, microchip",
         "Filtro per stato (attivo / venduto / ceduto)",
         "Grid di DogCard con azioni edit/delete",
         "Bottone «Aggiungi Cane» → apre DogForm modale",
         "Empty state con CTA appropriata"]
    ),
    (
        "5.3 DogDetail — Dettaglio Cane",
        "Pagina principale di gestione di un singolo cane, con 6 tab.",
        ["Tab Informazioni: pedigree, microchip, note",
         "Tab Crescita: misurazioni peso/altezza + grafico Recharts",
         "Tab Salute: record sanitari (vaccini, visite, terapie)",
         "Tab Calori (solo femmine): cicli reali e stimati, statistiche interciclo",
         "Tab Giudici: giudizi delle esposizioni con qualifica e testo",
         "Tab Storia: timeline cronologica di eventi e cicli",
         "Export PDF del profilo tramite DogPdfModal"]
    ),
    (
        "5.4 Breeding — Riproduzione",
        "Gestione di accoppiamenti e cucciolate.",
        ["2 tab: Cucciolate | Accoppiamenti",
         "Sub-tab cucciolate: attuali (< 6 mesi) e passate",
         "Ricerca per nome cane madre/padre",
         "LitterCard e MatingCard con edit/delete",
         "Form modale per nuova cucciolata o accoppiamento"]
    ),
    (
        "5.5 Puppies — Cuccioli",
        "Tracciamento e gestione dei cuccioli per cucciolata.",
        ["Raggruppamento per cucciolata con header collassabile",
         "Filtri stato: Tutti / Disponibili / Prenotati / Venduti / Deceduti",
         "4 stat card di riepilogo",
         "PuppyCard con edit/delete",
         "Ricerca interna per nome cucciolo"]
    ),
    (
        "5.6 Finance — Finanze",
        "Report e inserimento di entrate e uscite.",
        ["Navigazione anno precedente/successivo/corrente",
         "3 stat card: Entrate, Uscite, Bilancio",
         "Filtro per tipo transazione (Tutti / Entrate / Uscite)",
         "Lista cronologica con TransactionCard",
         "Cache query 5 minuti per ridurre richieste DB"]
    ),
    (
        "5.7 Health — Salute",
        "Registro sanitario aggregato su tutti i cani.",
        ["4 tab: Tutti / Vaccini / Visite / Terapie",
         "3 stat card: Vaccini Scaduti, Visite Programmate, Terapie Attive",
         "Grid HealthRecordCard ordinata per scadenza",
         "Calcolo automatico scadenza da data + giorni intervallo",
         "Form modale per nuovo record sanitario"]
    ),
    (
        "5.8 Calendar — Calendario",
        "Calendario mensile per la gestione degli appuntamenti.",
        ["Grid mensile con badge colorati per categoria evento",
         "Click su giorno → form nuovo evento pre-compilato con la data",
         "Click su evento → dettaglio con toggle completamento",
         "Legenda categorie: Veterinario, Toelettatura, Esposizione, Calore, Parto, Altro",
         "Edit/delete direttamente dal dettaglio evento",
         "Reminder automatici per eventi imminenti"]
    ),
    (
        "5.9 Judges — Giudici",
        "Gestione anagrafica giudici e giudizi delle esposizioni.",
        ["2 tab: Giudici | Tutti i Giudizi",
         "3 stat card: Giudici Registrati, Giudizi Totali, Eccellenti",
         "Tab Giudici: ricerca, card con conteggio giudizi + bottone «+ Giudizio»",
         "Tab Giudizi: filtri per giudice e qualifica + bottone «Aggiungi giudizio»",
         "Qualifiche: Eccellente, Molto Buono, Buono, Sufficiente, Qualificato, Fuori Concorso, Non Classificato",
         "JudgeModal (create/update giudice), JudgmentModal (create/update giudizio)"]
    ),
    (
        "5.10 Settings — Impostazioni",
        "Preferenze personali e dati dell'allevamento.",
        ["Sidebar con 4 sezioni: Profilo, Allevamento, Notifiche, Sicurezza",
         "Profilo: nome, email (readonly), telefono",
         "Allevamento: nome, affisso, partita IVA, indirizzo, sito web",
         "Sicurezza: cambio password, eliminazione account con doppia conferma",
         "Persistenza tramite tabella settings su Supabase"]
    ),
]

for title, desc, feats in pages_data:
    story += [
        h2(title),
        p(desc),
        bullets(feats),
        sp(),
    ]

story.append(PageBreak())

# ── 6. COMPONENTI ─────────────────────────────────────────────────────────────
story += [
    h1("6. Componenti Riutilizzabili"),
    hr(),
    h2("6.1 Layout"),
    section_table(
        ["Componente", "Descrizione"],
        [
            ["Layout.jsx",  "Wrapper principale con Header, Sidebar e area contenuto"],
            ["Header.jsx",  "Navbar superiore: logo, user menu, logout"],
            ["Sidebar.jsx", "Menu laterale collassabile con icone di navigazione"],
        ],
        col_widths=[5*cm, 11.5*cm]
    ),
    sp(),
    h2("6.2 Dogs"),
    section_table(
        ["Componente", "Descrizione"],
        [
            ["DogCard.jsx",         "Card cane: foto/avatar, info base, barra colore in fondo (flex-col per allineamento)"],
            ["DogForm.jsx",         "Form modale create/update cane (tutti i campi + color picker)"],
            ["DogProfile.jsx",      "Header dettaglio cane con avatar, status badge, sesso"],
            ["DogMeasurements.jsx", "Tab misurazioni peso/altezza con add/edit/delete"],
            ["DogGrowthChart.jsx",  "Grafico crescita con Recharts (peso e altezza)"],
            ["DogPdfModal.jsx",     "Export PDF profilo cane via html2canvas + jsPDF"],
        ],
        col_widths=[5.5*cm, 11*cm]
    ),
    sp(),
    h2("6.3 Breeding, Puppies, Finance, Health, Calendar"),
    section_table(
        ["Componente", "Descrizione"],
        [
            ["LitterCard / LitterForm",       "Card e form cucciolata"],
            ["MatingCard / MatingForm",        "Card e form accoppiamento"],
            ["PuppyCard / PuppyForm",          "Card e form cucciolo"],
            ["TransactionCard / TransactionForm", "Card e form transazione finanziaria"],
            ["HealthRecordCard / HealthRecordForm", "Card e form record sanitario"],
            ["EventForm / EventCard",          "Form e card per eventi calendario"],
            ["ProtectedRoute.jsx",             "HOC: redirige a /auth se utente non autenticato"],
        ],
        col_widths=[6*cm, 10.5*cm]
    ),
    sp(2),
]

# ── 7. DATABASE ───────────────────────────────────────────────────────────────
story += [
    h1("7. Schema Database (Supabase)"),
    hr(),
    p("Tutte le tabelle hanno <b>Row Level Security (RLS)</b> abilitata. "
      "Ogni record è isolato per utente tramite la colonna <i>user_id</i> riferita a <i>auth.users</i>."),
    sp(),
]

tables = [
    ("dogs",            "Cani",           ["id", "user_id", "name", "breed", "gender", "birth_date", "status", "color", "weight", "height", "microchip", "pedigree_number", "notes"]),
    ("heat_cycles",     "Cicli estri",    ["id", "user_id", "dog_id", "start_date", "end_date", "duration_days", "notes"]),
    ("matings",         "Accoppiamenti",  ["id", "user_id", "female_id", "male_id", "mating_date", "litter_birth_date", "gestation_days", "notes"]),
    ("litters",         "Cucciolate",     ["id", "user_id", "mating_id", "birth_date", "females", "males", "total_puppies", "alive_puppies"]),
    ("puppies",         "Cuccioli",       ["id", "user_id", "litter_id", "name", "gender", "color", "status", "price"]),
    ("expenses",        "Spese",          ["id", "user_id", "dog_id", "category", "description", "amount", "expense_date"]),
    ("income",          "Entrate",        ["id", "user_id", "puppy_id", "category", "description", "amount", "income_date"]),
    ("health_records",  "Sanità",         ["id", "user_id", "dog_id", "record_type", "description", "record_date", "next_appointment_date"]),
    ("events",          "Calendario",     ["id", "user_id", "title", "description", "event_date", "event_type", "dog_ids[]", "completed", "reminder_days"]),
    ("judges",          "Giudici",        ["id", "user_id", "name", "nationality", "specialization", "notes"]),
    ("dog_judgments",   "Giudizi",        ["id", "user_id", "dog_id", "judge_id", "judgment_date", "show_name", "grade", "judgment_text", "our_comments"]),
    ("dog_measurements","Misurazioni",    ["id", "user_id", "dog_id", "measurement_date", "weight", "height"]),
    ("settings",        "Impostazioni",   ["id", "user_id", "kennel_name", "kennel_affix", "owner_name", "phone", "address", "vat_number", "website"]),
]

for tname, tdesc, tcols in tables:
    story += [
        h3(f"7.x  {tname}  —  {tdesc}"),
        p(", ".join(f"<i>{c}</i>" for c in tcols)),
        sp(0.5),
    ]

story.append(PageBreak())

# ── 8. FUNZIONI DB ────────────────────────────────────────────────────────────
story += [
    h1("8. Funzioni Database (supabase.js)"),
    hr(),
    p("Il file <b>src/lib/supabase.js</b> esporta l'oggetto <i>db</i> con tutti i metodi asincroni. "
      "Ogni metodo di scrittura chiama internamente <i>getCurrentUserId()</i> per recuperare l'UID "
      "dall'auth Supabase e aggiunge automaticamente <i>user_id</i> al payload."),
    sp(),
    section_table(
        ["Gruppo", "Funzione", "Descrizione"],
        [
            ["Cani",        "getDogs(status)",            "Lista cani con filtro stato opzionale"],
            ["Cani",        "getDog(id)",                 "Cane singolo per ID"],
            ["Cani",        "createDog(dog)",             "Inserisce nuovo cane"],
            ["Cani",        "updateDog(id, updates)",     "Aggiorna campi cane"],
            ["Cani",        "deleteDog(id)",              "Elimina cane"],
            ["Cicli",       "getHeatCycles(dogId)",       "Cicli estri di un cane"],
            ["Cicli",       "createHeatCycle(cycle)",     "Nuovo ciclo estro"],
            ["Finanze",     "getExpenses(filters)",       "Spese con filtri data/categoria"],
            ["Finanze",     "getIncome(filters)",         "Entrate con filtri data/categoria"],
            ["Finanze",     "getYearlyIncome(year)",      "Totale entrate anno"],
            ["Finanze",     "getYearlyExpenses(year)",    "Totale spese anno"],
            ["Cuccioli",    "getPuppies(litterId,status)","Lista cuccioli con filtri"],
            ["Cucciolate",  "getLitters()",               "Cucciolate con join mating"],
            ["Accoppiamenti","getMatings()",              "Lista accoppiamenti"],
            ["Misurazioni", "getDogMeasurements(dogId)",  "Misurazioni ordinate per data"],
            ["Salute",      "getHealthRecords(dogId)",    "Record sanitari per cane"],
            ["Eventi",      "getEvents(filters)",         "Eventi calendario con filtri"],
            ["Giudici",     "getJudges()",                "Lista giudici ordinata per nome"],
            ["Giudizi",     "getAllJudgments()",          "Tutti i giudizi con join judge+dog"],
            ["Giudizi",     "getJudgments(dogId)",        "Giudizi di un cane specifico"],
            ["Storage",     "uploadImage(file,bucket,path)","Upload foto su Supabase Storage"],
            ["Stats",       "getActiveDogs()",            "Count cani attivi"],
            ["Stats",       "getAvailablePuppies()",      "Count cuccioli disponibili"],
            ["Settings",    "getSettings()",              "Preferenze utente corrente"],
            ["Settings",    "updateSettings(updates)",    "Salva preferenze"],
        ],
        col_widths=[3*cm, 6*cm, 7.5*cm]
    ),
    sp(2),
]

# ── 9. AUTH ────────────────────────────────────────────────────────────────────
story += [
    h1("9. Autenticazione"),
    hr(),
    p("L'autenticazione è gestita da <b>Supabase Auth</b> con sessione persistita nel browser. "
      "Il <b>AuthContext</b> espone il hook <i>useAuth()</i> disponibile in tutta l'app."),
    sp(),
    h2("9.1 Metodi supportati"),
    bullets([
        "<b>Email + Password</b> — login e registrazione standard",
        "<b>OAuth Google</b> — login con account Google",
        "<b>Password Reset</b> — invio link di reset via email",
    ]),
    sp(),
    h2("9.2 useAuth() Hook"),
    info_table([
        ("user",        "Oggetto utente Supabase (null se non autenticato)"),
        ("loading",     "true durante il controllo iniziale della sessione"),
        ("signOut()",   "Effettua il logout e reindirizza a /auth"),
        ("isPrivate",   "true se user.user_metadata.account_type === 'privato'"),
    ]),
    sp(),
    h2("9.3 Registrazione"),
    p("Al momento della registrazione vengono eseguiti automaticamente:"),
    bullets([
        "Creazione utente in Supabase Auth",
        "Inserimento record nella tabella <i>settings</i> con kennel_name",
    ]),
    sp(2),
]

# ── 10. FUNZIONALITÀ AVANZATE ─────────────────────────────────────────────────
story += [
    h1("10. Funzionalità Avanzate"),
    hr(),
    h2("10.1 Export PDF Profilo Cane"),
    p("Implementato in <b>DogPdfModal.jsx</b> usando la combinazione <i>html2canvas</i> + <i>jsPDF</i>:"),
    bullets([
        "Rendering DOM del profilo cane in un div nascosto",
        "html2canvas converte il DOM in canvas PNG",
        "jsPDF inserisce il canvas come immagine nel PDF",
        "jspdf-autotable per eventuali tabelle strutturate",
    ]),
    sp(),
    h2("10.2 Tracciamento Cicli Estri"),
    p("La tab <b>Calori</b> (solo femmine) offre:"),
    bullets([
        "Registro cicli reali con data inizio/fine e durata",
        "Stima automatica del prossimo calore basata sulla media degli intercicli",
        "Sincronizzazione automatica con il Calendario: crea/aggiorna evento di tipo <i>calore_stimato</i>",
        "Calcolo automatico parto stimato (63 gg) al salvataggio di un accoppiamento",
    ]),
    sp(),
    h2("10.3 Grafici di Crescita"),
    p("Implementati con <b>Recharts</b> in <i>DogGrowthChart.jsx</i>: "
      "LineChart dual-axis per peso (kg) e altezza (cm) nel tempo, con tooltip e legenda."),
    sp(),
    h2("10.4 PWA"),
    p("Configurata tramite <b>vite-plugin-pwa</b>: l'app è installabile su dispositivi mobili e "
      "desktop, con service worker per caching delle risorse statiche."),
    sp(),
    h2("10.5 Notifiche Push"),
    p("Integrazione <b>OneSignal</b> tramite il hook <i>useNotifications.js</i> per notifiche push "
      "su eventi imminenti (scadenze vaccini, calori stimati, appuntamenti)."),
    sp(2),
]

# ── 11. SECURITY ──────────────────────────────────────────────────────────────
story += [
    h1("11. Sicurezza"),
    hr(),
    h2("11.1 Row Level Security (RLS)"),
    p("Tutte le tabelle Supabase hanno RLS abilitata con policy che isolano i dati per utente:"),
    code(
        "-- Esempio policy SELECT\n"
        "create policy \"Utente vede solo i propri dati\"\n"
        "  on judges for select using (auth.uid() = user_id);\n\n"
        "-- Esempio policy INSERT\n"
        "create policy \"Utente inserisce propri dati\"\n"
        "  on judges for insert with check (auth.uid() = user_id);"
    ),
    sp(),
    h2("11.2 Protezione Rotte"),
    p("Il componente <b>ProtectedRoute</b> verifica la sessione ad ogni navigazione. "
      "Se la sessione è scaduta o assente, l'utente viene reindirizzato automaticamente a <i>/auth</i>."),
    sp(),
    h2("11.3 Storage"),
    p("Le immagini vengono caricate su Supabase Storage in bucket isolati per utente "
      "(path: <i>userId/path/filename</i>). Le chiavi di accesso sono gestite lato Supabase "
      "e mai esposte nel codice client."),
    sp(2),
]

# ── 12. DEPLOY ────────────────────────────────────────────────────────────────
story += [
    h1("12. Build e Deploy"),
    hr(),
    info_table([
        ("Build command",   "npm run build"),
        ("Output directory","dist/"),
        ("Node minimo",     "Node.js 18+"),
        ("Browser target",  "ES2020+ (Chrome, Firefox, Safari, Edge moderni)"),
        ("Env vars",        "VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY"),
    ]),
    sp(),
    p("Il progetto è compatibile con qualsiasi hosting statico (Vercel, Netlify, Cloudflare Pages). "
      "Il file <i>vite.config.js</i> include il plugin PWA per la generazione automatica del "
      "Service Worker e del manifest."),
    sp(2),
    PageBreak(),
]

# ── APPENDICE SQL ──────────────────────────────────────────────────────────────
story += [
    h1("Appendice — SQL Setup Tabelle Principali"),
    hr(),
    p("Eseguire nel <b>SQL Editor</b> di Supabase per creare le tabelle giudici e giudizi:"),
    sp(),
    code(
        "-- Tabella giudici\n"
        "create table if not exists judges (\n"
        "  id            uuid primary key default gen_random_uuid(),\n"
        "  user_id       uuid not null references auth.users(id) on delete cascade,\n"
        "  name          text not null,\n"
        "  nationality   text,\n"
        "  specialization text,\n"
        "  notes         text,\n"
        "  created_at    timestamptz default now()\n"
        ");\n"
        "alter table judges enable row level security;\n"
        "create policy \"sel\" on judges for select using (auth.uid() = user_id);\n"
        "create policy \"ins\" on judges for insert with check (auth.uid() = user_id);\n"
        "create policy \"upd\" on judges for update using (auth.uid() = user_id);\n"
        "create policy \"del\" on judges for delete using (auth.uid() = user_id);\n\n"
        "-- Tabella giudizi\n"
        "create table if not exists dog_judgments (\n"
        "  id             uuid primary key default gen_random_uuid(),\n"
        "  user_id        uuid not null references auth.users(id) on delete cascade,\n"
        "  dog_id         uuid not null references dogs(id) on delete cascade,\n"
        "  judge_id       uuid not null references judges(id) on delete cascade,\n"
        "  judgment_date  date not null,\n"
        "  show_name      text,\n"
        "  grade          text,\n"
        "  judgment_text  text,\n"
        "  our_comments   text,\n"
        "  created_at     timestamptz default now()\n"
        ");\n"
        "alter table dog_judgments enable row level security;\n"
        "create policy \"sel\" on dog_judgments for select using (auth.uid() = user_id);\n"
        "create policy \"ins\" on dog_judgments for insert with check (auth.uid() = user_id);\n"
        "create policy \"upd\" on dog_judgments for update using (auth.uid() = user_id);\n"
        "create policy \"del\" on dog_judgments for delete using (auth.uid() = user_id);"
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# BUILD
# ══════════════════════════════════════════════════════════════════════════════

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2.5*cm, bottomMargin=2*cm,
    title="Allevamento Manager — Documentazione Tecnica",
    author="Generato automaticamente",
)

doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(f"PDF generato: {OUTPUT}")
