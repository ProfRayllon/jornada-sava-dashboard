-- Novos perfis (cargos) no cadastro de colaboradores e o coordenador de cada um.
-- Só "adm" e "adv" pontuam; "sistema", "rh" e "coord" organizam a equipe.
ALTER TABLE pessoas DROP CONSTRAINT IF EXISTS pessoas_categoria_check;
ALTER TABLE pessoas ADD CONSTRAINT pessoas_categoria_check CHECK (categoria IN ('sistema', 'adm', 'adv', 'rh', 'coord'));
ALTER TABLE pessoas ADD COLUMN coordenador_id TEXT REFERENCES pessoas (id) ON DELETE SET NULL;
