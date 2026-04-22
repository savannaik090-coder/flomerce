-- Adds per-site Microsoft Translator credentials and toggles for the
-- shopper-facing language switcher (System B).
--
-- Each merchant pastes their OWN Microsoft Translator key + region into their
-- site settings. Flomerce never reads or bills against this key — Microsoft
-- bills the merchant directly. The encrypted blob is stored in
-- translator_api_key_encrypted (AES-GCM via SETTINGS_ENCRYPTION_KEY); the raw
-- key is never returned by any read endpoint.
--
-- translator_languages stores a JSON array of locale codes the merchant has
-- chosen to offer shoppers (e.g. ["hi","ar","es"]). The master toggle
-- translator_enabled cannot be flipped on until a key is saved.
ALTER TABLE sites ADD COLUMN translator_api_key_encrypted TEXT;
ALTER TABLE sites ADD COLUMN translator_region TEXT;
ALTER TABLE sites ADD COLUMN translator_enabled INTEGER DEFAULT 0;
ALTER TABLE sites ADD COLUMN translator_languages TEXT;
