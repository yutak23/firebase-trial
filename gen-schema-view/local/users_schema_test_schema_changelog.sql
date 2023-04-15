SELECT
  document_name,
  document_id,
  timestamp,
  operation,
  JSON_EXTRACT_SCALAR(data, '$.email') AS email,
  JSON_EXTRACT_SCALAR(data, '$.last_name') AS last_name,
  JSON_EXTRACT_SCALAR(data, '$.first_name') AS first_name
FROM
  `fir-cloud-functions-trial.firestore_export.users_raw_changelog`