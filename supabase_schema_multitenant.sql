-- ============================================
-- SCHEMA DATABASE GESTIONALE ALLEVAMENTO CANI
-- VERSIONE MULTI-TENANT CON RLS
-- ============================================

-- Abilita le estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELLA: dogs (Cani in allevamento)
-- ============================================
CREATE TABLE dogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    microchip VARCHAR(50) UNIQUE,
    breed VARCHAR(100) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('maschio', 'femmina')),
    birth_date DATE NOT NULL,
    color VARCHAR(50),
    pedigree_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'attivo' CHECK (status IN ('attivo', 'venduto', 'deceduto', 'ceduto')),
    photo_url TEXT,
    notes TEXT,
    purchase_price DECIMAL(10,2),
    purchase_date DATE,
    owner_name VARCHAR(100), -- se venduto
    owner_contact VARCHAR(100),
    sale_date DATE,
    sale_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELLA: heat_cycles (Calori femmine)
-- ============================================
CREATE TABLE heat_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    duration_days INTEGER,
    notes TEXT,
    mating_occurred BOOLEAN DEFAULT FALSE,
    next_estimated_date DATE, -- calcolato automaticamente
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELLA: matings (Accoppiamenti)
-- ============================================
CREATE TABLE matings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    female_id UUID REFERENCES dogs(id),
    male_id UUID REFERENCES dogs(id),
    mating_date DATE NOT NULL,
    heat_cycle_id UUID REFERENCES heat_cycles(id),
    expected_delivery DATE, -- +63 giorni dal mating
    confirmed_pregnancy BOOLEAN DEFAULT FALSE,
    pregnancy_confirmed_date DATE,
    notes TEXT,
    stud_fee DECIMAL(10,2), -- se si usa un maschio esterno
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELLA: litters (Cucciolate)
-- ============================================
CREATE TABLE litters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mating_id UUID REFERENCES matings(id),
    birth_date DATE NOT NULL,
    total_puppies INTEGER NOT NULL,
    alive_puppies INTEGER NOT NULL,
    deceased_puppies INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELLA: puppies (Cuccioli della cucciolata)
-- ============================================
CREATE TABLE puppies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    litter_id UUID REFERENCES litters(id) ON DELETE CASCADE,
    dog_id UUID REFERENCES dogs(id), -- link al cane se rimane in allevamento
    name VARCHAR(100),
    gender VARCHAR(10) CHECK (gender IN ('maschio', 'femmina')),
    color VARCHAR(50),
    birth_weight DECIMAL(5,2), -- in kg
    status VARCHAR(20) DEFAULT 'disponibile' CHECK (status IN ('disponibile', 'prenotato', 'venduto', 'deceduto', 'trattenuto')),
    microchip VARCHAR(50) UNIQUE,
    sale_price DECIMAL(10,2),
    buyer_name VARCHAR(100),
    buyer_contact VARCHAR(100),
    sale_date DATE,
    deposit_amount DECIMAL(10,2),
    deposit_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELLA: expenses (Spese)
-- ============================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL, -- opzionale, se spesa specifica
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'veterinario', 'alimentazione', 'toelettatura',
        'medicinali', 'attrezzatura', 'esposizioni',
        'riproduzione', 'addestramento', 'altro'
    )),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50),
    receipt_url TEXT, -- link a foto scontrino in Supabase Storage
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELLA: income (Incassi)
-- ============================================
CREATE TABLE income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    puppy_id UUID REFERENCES puppies(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'vendita_cucciolo', 'monta', 'pensione',
        'addestramento', 'altro'
    )),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    income_date DATE NOT NULL,
    payment_method VARCHAR(50),
    invoice_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELLA: health_records (Cartelle sanitarie)
-- ============================================
CREATE TABLE health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN (
        'vaccinazione', 'visita', 'intervento',
        'esame', 'trattamento', 'altro'
    )),
    description TEXT NOT NULL,
    record_date DATE NOT NULL,
    veterinarian VARCHAR(100),
    cost DECIMAL(10,2),
    next_appointment_date DATE, -- per richiami vaccinali
    documents_url TEXT, -- link a documenti in Storage
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELLA: events (Eventi/Appuntamenti)
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'veterinario', 'toelettatura', 'esposizione',
        'calore_stimato', 'parto_stimato', 'altro'
    )),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    reminder_days INTEGER DEFAULT 3, -- giorni prima per reminder
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELLA: settings (Impostazioni allevamento)
-- ============================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    kennel_name VARCHAR(200),
    kennel_affix VARCHAR(100), -- affisso allevamento
    owner_name VARCHAR(100),
    vat_number VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(200),
    logo_url TEXT,
    default_heat_cycle_days INTEGER DEFAULT 180, -- media giorni tra calori
    default_pregnancy_days INTEGER DEFAULT 63,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDICI per performance
-- ============================================
CREATE INDEX idx_dogs_user ON dogs(user_id);
CREATE INDEX idx_dogs_status ON dogs(status);
CREATE INDEX idx_dogs_breed ON dogs(breed);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_income_user ON income(user_id);
CREATE INDEX idx_income_date ON income(income_date);
CREATE INDEX idx_health_records_user ON health_records(user_id);
CREATE INDEX idx_health_records_dog ON health_records(dog_id);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_heat_cycles_user ON heat_cycles(user_id);
CREATE INDEX idx_heat_cycles_dog ON heat_cycles(dog_id);
CREATE INDEX idx_puppies_user ON puppies(user_id);
CREATE INDEX idx_puppies_status ON puppies(status);
CREATE INDEX idx_matings_user ON matings(user_id);
CREATE INDEX idx_litters_user ON litters(user_id);

-- ============================================
-- TRIGGER per auto-update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dogs_updated_at BEFORE UPDATE ON dogs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNZIONE: Calcolo prossimo calore stimato
-- ============================================
CREATE OR REPLACE FUNCTION calculate_next_heat()
RETURNS TRIGGER AS $$
DECLARE
    avg_cycle_days INTEGER;
BEGIN
    -- Calcola media cicli precedenti o usa default dell'utente
    SELECT COALESCE(
        AVG(EXTRACT(DAY FROM (end_date - start_date))),
        (SELECT default_heat_cycle_days FROM settings WHERE user_id = NEW.user_id LIMIT 1)
    ) INTO avg_cycle_days
    FROM heat_cycles
    WHERE dog_id = NEW.dog_id AND user_id = NEW.user_id AND end_date IS NOT NULL;

    -- Stima prossimo calore
    NEW.next_estimated_date = NEW.start_date + (avg_cycle_days || ' days')::INTERVAL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_next_heat
BEFORE INSERT OR UPDATE ON heat_cycles
FOR EACH ROW EXECUTE FUNCTION calculate_next_heat();

-- ============================================
-- FUNZIONE: Auto-creazione evento parto stimato
-- ============================================
CREATE OR REPLACE FUNCTION create_delivery_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.confirmed_pregnancy = TRUE THEN
        INSERT INTO events (user_id, dog_id, event_type, title, event_date, description)
        VALUES (
            NEW.user_id,
            NEW.female_id,
            'parto_stimato',
            'Parto stimato - ' || (SELECT name FROM dogs WHERE id = NEW.female_id),
            NEW.expected_delivery,
            'Parto stimato da accoppiamento del ' || NEW.mating_date
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_delivery_event
AFTER INSERT OR UPDATE ON matings
FOR EACH ROW EXECUTE FUNCTION create_delivery_event();

-- ============================================
-- FUNZIONE: Dashboard Summary per utente
-- ============================================
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_user_id UUID)
RETURNS TABLE (
    total_active_dogs BIGINT,
    available_puppies BIGINT,
    monthly_income NUMERIC,
    monthly_expenses NUMERIC,
    upcoming_events BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM dogs WHERE status = 'attivo' AND user_id = p_user_id),
        (SELECT COUNT(*) FROM puppies WHERE status = 'disponibile' AND user_id = p_user_id),
        (SELECT COALESCE(SUM(amount), 0) FROM income WHERE user_id = p_user_id AND EXTRACT(MONTH FROM income_date) = EXTRACT(MONTH FROM CURRENT_DATE)),
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = p_user_id AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)),
        (SELECT COUNT(*) FROM events WHERE user_id = p_user_id AND event_date >= CURRENT_DATE AND event_date <= CURRENT_DATE + INTERVAL '7 days' AND completed = FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNZIONE: Inizializzazione settings per nuovo utente
-- ============================================
CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO settings (user_id, kennel_name, default_heat_cycle_days, default_pregnancy_days)
    VALUES (NEW.id, 'Il Mio Allevamento', 180, 63);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per creare automaticamente settings quando si registra un nuovo utente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_settings();

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Multi-tenant
-- ============================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE heat_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matings ENABLE ROW LEVEL SECURITY;
ALTER TABLE litters ENABLE ROW LEVEL SECURITY;
ALTER TABLE puppies ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICY: dogs
-- ============================================
CREATE POLICY "Users can view own dogs"
    ON dogs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dogs"
    ON dogs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dogs"
    ON dogs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dogs"
    ON dogs FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICY: heat_cycles
-- ============================================
CREATE POLICY "Users can view own heat_cycles"
    ON heat_cycles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own heat_cycles"
    ON heat_cycles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own heat_cycles"
    ON heat_cycles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own heat_cycles"
    ON heat_cycles FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICY: matings
-- ============================================
CREATE POLICY "Users can view own matings"
    ON matings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own matings"
    ON matings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own matings"
    ON matings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own matings"
    ON matings FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICY: litters
-- ============================================
CREATE POLICY "Users can view own litters"
    ON litters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own litters"
    ON litters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own litters"
    ON litters FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own litters"
    ON litters FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICY: puppies
-- ============================================
CREATE POLICY "Users can view own puppies"
    ON puppies FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own puppies"
    ON puppies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own puppies"
    ON puppies FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own puppies"
    ON puppies FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICY: expenses
-- ============================================
CREATE POLICY "Users can view own expenses"
    ON expenses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
    ON expenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
    ON expenses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
    ON expenses FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICY: income
-- ============================================
CREATE POLICY "Users can view own income"
    ON income FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income"
    ON income FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income"
    ON income FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own income"
    ON income FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICY: health_records
-- ============================================
CREATE POLICY "Users can view own health_records"
    ON health_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health_records"
    ON health_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health_records"
    ON health_records FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health_records"
    ON health_records FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICY: events
-- ============================================
CREATE POLICY "Users can view own events"
    ON events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
    ON events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
    ON events FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
    ON events FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POLICY: settings
-- ============================================
CREATE POLICY "Users can view own settings"
    ON settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
    ON settings FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- STORAGE POLICIES (se usi Supabase Storage)
-- ============================================
-- Decommentare e adattare se usi Storage per foto/documenti

-- Crea bucket per foto cani
-- INSERT INTO storage.buckets (id, name, public) VALUES ('dogs-photos', 'dogs-photos', false);

-- Policy per upload foto
-- CREATE POLICY "Users can upload own photos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--     bucket_id = 'dogs-photos'
--     AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy per visualizzare foto
-- CREATE POLICY "Users can view own photos"
-- ON storage.objects FOR SELECT
-- USING (
--     bucket_id = 'dogs-photos'
--     AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy per cancellare foto
-- CREATE POLICY "Users can delete own photos"
-- ON storage.objects FOR DELETE
-- USING (
--     bucket_id = 'dogs-photos'
--     AND auth.uid()::text = (storage.foldername(name))[1]
-- );

