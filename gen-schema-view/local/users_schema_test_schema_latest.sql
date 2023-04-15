-- Given a user-defined schema over a raw JSON changelog, returns the
-- schema elements of the latest set of live documents in the collection.
--   timestamp: The Firestore timestamp at which the event took place.
--   operation: One of INSERT, UPDATE, DELETE, IMPORT.
--   event_id: The event that wrote this row.
--   <schema-fields>: This can be one, many, or no typed-columns
--                    corresponding to fields defined in the schema.
SELECT
  document_name,
  document_id,
  timestamp,
  operation,
  email,
  last_name,
  first_name
FROM
  (
    SELECT
      document_name,
      document_id,
      FIRST_VALUE(timestamp) OVER(
        PARTITION BY document_name
        ORDER BY
          timestamp DESC
      ) AS timestamp,
      FIRST_VALUE(operation) OVER(
        PARTITION BY document_name
        ORDER BY
          timestamp DESC
      ) AS operation,
      FIRST_VALUE(operation) OVER(
        PARTITION BY document_name
        ORDER BY
          timestamp DESC
      ) = "DELETE" AS is_deleted,
      FIRST_VALUE(JSON_EXTRACT_SCALAR(data, '$.email')) OVER(
        PARTITION BY document_name
        ORDER BY
          timestamp DESC
      ) AS email,
      FIRST_VALUE(JSON_EXTRACT_SCALAR(data, '$.last_name')) OVER(
        PARTITION BY document_name
        ORDER BY
          timestamp DESC
      ) AS last_name,
      FIRST_VALUE(JSON_EXTRACT_SCALAR(data, '$.first_name')) OVER(
        PARTITION BY document_name
        ORDER BY
          timestamp DESC
      ) AS first_name
    FROM
      `fir-cloud-functions-trial.firestore_export.users_raw_latest`
  )
WHERE
  NOT is_deleted
GROUP BY
  document_name,
  document_id,
  timestamp,
  operation,
  email,
  last_name,
  first_name