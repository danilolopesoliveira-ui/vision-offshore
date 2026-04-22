-- Fonte de verdade da view de inadimplência.
-- Aplicada via migration raw (ver migrations/).
-- Sempre usar CREATE OR REPLACE ao alterar.

CREATE OR REPLACE VIEW delinquency_view AS
SELECT
  o.id                                                          AS obligation_id,
  ic.id                                                         AS client_id,
  ic.name                                                       AS client_name,
  oc.id                                                         AS offshore_id,
  oc.name                                                       AS offshore_name,
  o.origin                                                      AS origin,
  o.nature                                                      AS nature,
  o."serviceProviderId"                                         AS service_provider_id,
  COALESCE(o."dueDateAdjusted", o."dueDateOriginal")            AS effective_due,
  o."invoiceValue"                                              AS invoice_value,
  o."invoiceCurrency"                                           AS invoice_currency,
  (CURRENT_DATE - COALESCE(o."dueDateAdjusted", o."dueDateOriginal")::date) AS days_overdue,
  CASE
    WHEN (CURRENT_DATE - COALESCE(o."dueDateAdjusted", o."dueDateOriginal")::date) > 90 THEN '90+'
    WHEN (CURRENT_DATE - COALESCE(o."dueDateAdjusted", o."dueDateOriginal")::date) > 60 THEN '61-90'
    WHEN (CURRENT_DATE - COALESCE(o."dueDateAdjusted", o."dueDateOriginal")::date) > 30 THEN '31-60'
    ELSE '0-30'
  END AS bucket
FROM "Obligation" o
JOIN "OffshoreCompany" oc ON oc.id = o."offshoreId"
JOIN "IndividualClient" ic ON ic.id = oc."individualClientId"
WHERE o.status = 'PENDING'
  AND COALESCE(o."dueDateAdjusted", o."dueDateOriginal")::date < CURRENT_DATE;
