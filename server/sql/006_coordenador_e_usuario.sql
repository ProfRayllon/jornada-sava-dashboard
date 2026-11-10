-- O coordenador de cada colaborador passa a ser um login da Equipe e acessos com o perfil
-- "Coordenador" (id interno "lider"), e não mais um colaborador.
ALTER TABLE pessoas DROP CONSTRAINT IF EXISTS pessoas_coordenador_id_fkey;
UPDATE pessoas SET coordenador_id = NULL;
ALTER TABLE pessoas ADD CONSTRAINT pessoas_coordenador_id_fkey FOREIGN KEY (coordenador_id) REFERENCES usuarios (id) ON DELETE SET NULL;
