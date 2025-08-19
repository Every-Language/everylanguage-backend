import postgres from 'postgres';

export function createDb(
  env: { PG_DEV: Hyperdrive; PG_PROD: Hyperdrive },
  project: 'dev' | 'prod'
) {
  const hyperdrive = project === 'dev' ? env.PG_DEV : env.PG_PROD;
  return postgres(hyperdrive.connectionString, { fetch_types: false, max: 5 });
}

// No re-export. We rely on tagged template helpers provided by the client instance.
