    -- ============================================
-- TABELLA: dog_measurements (Misurazioni peso/altezza nel tempo)
-- Per tracciare la crescita dei cani
-- ============================================

CREATE TABLE IF NOT EXISTS dog_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight DECIMAL(5,2), -- peso in kg
    height DECIMAL(5,2), -- altezza in cm
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_dog_measurements_dog_id ON dog_measurements(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_measurements_user_id ON dog_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_dog_measurements_date ON dog_measurements(measurement_date);

-- Row Level Security (RLS)
ALTER TABLE dog_measurements ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti possono vedere solo le proprie misurazioni
CREATE POLICY "Users can view own dog measurements"
    ON dog_measurements FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Gli utenti possono inserire misurazioni per i propri cani
CREATE POLICY "Users can insert own dog measurements"
    ON dog_measurements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Gli utenti possono aggiornare le proprie misurazioni
CREATE POLICY "Users can update own dog measurements"
    ON dog_measurements FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Gli utenti possono eliminare le proprie misurazioni
CREATE POLICY "Users can delete own dog measurements"
    ON dog_measurements FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_dog_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dog_measurements_updated_at
    BEFORE UPDATE ON dog_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_dog_measurements_updated_at();

-- Commento: Quando aggiungi una misurazione, aggiorna anche i campi weight/height della tabella dogs
CREATE OR REPLACE FUNCTION update_dog_latest_measurements()
RETURNS TRIGGER AS $$
BEGIN
    -- Aggiorna i campi weight e height nella tabella dogs con gli ultimi valori
    UPDATE dogs
    SET
        weight = NEW.weight,
        height = NEW.height,
        updated_at = NOW()
    WHERE id = NEW.dog_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dog_latest_measurements
    AFTER INSERT OR UPDATE ON dog_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_dog_latest_measurements();

-- Verifica la tabella creata
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'dog_measurements'
ORDER BY ordinal_position;

