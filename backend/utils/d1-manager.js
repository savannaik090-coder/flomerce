const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

function getCredentials(env) {
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!apiToken || !accountId) {
    throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required');
  }
  return { apiToken, accountId };
}

function cfHeaders(apiToken) {
  return {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

export async function createDatabase(env, name) {
  const { apiToken, accountId } = getCredentials(env);

  const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database`, {
    method: 'POST',
    headers: cfHeaders(apiToken),
    body: JSON.stringify({ name }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(`Failed to create D1 database: ${JSON.stringify(data.errors)}`);
  }

  return {
    id: data.result.uuid,
    name: data.result.name,
    created_at: data.result.created_at,
  };
}

export async function deleteDatabase(env, databaseId) {
  const { apiToken, accountId } = getCredentials(env);

  const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database/${databaseId}`, {
    method: 'DELETE',
    headers: cfHeaders(apiToken),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(`Failed to delete D1 database: ${JSON.stringify(data.errors)}`);
  }

  return true;
}

export async function getDatabaseSize(env, databaseId) {
  const { apiToken, accountId } = getCredentials(env);

  const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database/${databaseId}`, {
    method: 'GET',
    headers: cfHeaders(apiToken),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(`Failed to get D1 database info: ${JSON.stringify(data.errors)}`);
  }

  return data.result.file_size || 0;
}

export async function runSchemaOnDB(env, databaseId, sqlStatements) {
  const { apiToken, accountId } = getCredentials(env);

  const coreStatements = [];
  const alterStatements = [];

  for (const sql of sqlStatements) {
    if (sql.trim().toUpperCase().startsWith('ALTER TABLE')) {
      alterStatements.push(sql);
    } else {
      coreStatements.push(sql);
    }
  }

  const BATCH_SIZE = 15;
  for (let i = 0; i < coreStatements.length; i += BATCH_SIZE) {
    const batch = coreStatements.slice(i, i + BATCH_SIZE);
    const combinedSql = batch.join(';\n');

    const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`, {
      method: 'POST',
      headers: cfHeaders(apiToken),
      body: JSON.stringify({ sql: combinedSql }),
    });

    const data = await res.json();
    if (!data.success) {
      console.error(`Schema batch failed (statements ${i}-${i + batch.length}):`, data.errors);
      throw new Error(`Failed to run schema SQL batch: ${JSON.stringify(data.errors)}`);
    }
  }

  const ALTER_BATCH = 10;
  for (let i = 0; i < alterStatements.length; i += ALTER_BATCH) {
    const batch = alterStatements.slice(i, i + ALTER_BATCH);
    for (const sql of batch) {
      try {
        const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`, {
          method: 'POST',
          headers: cfHeaders(apiToken),
          body: JSON.stringify({ sql }),
        });
        const data = await res.json();
        if (!data.success) {
          const errStr = JSON.stringify(data.errors || []);
          if (errStr.includes('duplicate column') || errStr.includes('already exists')) {
            continue;
          }
          console.error(`ALTER failed: ${sql.substring(0, 80)}`, data.errors);
        }
      } catch (e) {
        console.error(`ALTER error: ${sql.substring(0, 80)}`, e.message);
      }
    }
  }

  return true;
}

export async function addBindingAndRedeploy(env, siteId, databaseId, bindingName) {
  const { apiToken, accountId } = getCredentials(env);
  const workerName = 'saas-platform';

  const getRes = await fetch(`${CF_API_BASE}/accounts/${accountId}/workers/scripts/${workerName}/settings`, {
    method: 'GET',
    headers: cfHeaders(apiToken),
  });

  const getData = await getRes.json();
  if (!getData.success) {
    throw new Error(`Failed to get worker settings: ${JSON.stringify(getData.errors)}`);
  }

  const currentBindings = getData.result?.bindings || [];

  const existingBinding = currentBindings.find(b => b.name === bindingName);
  if (existingBinding && existingBinding.id === databaseId) {
    console.log(`Binding ${bindingName} already exists with correct DB ID, skipping redeploy`);
    return true;
  }

  let updatedBindings;
  if (existingBinding) {
    updatedBindings = currentBindings.map(b =>
      b.name === bindingName ? { ...b, id: databaseId } : b
    );
    console.log(`Updating binding ${bindingName} from ${existingBinding.id} to ${databaseId}`);
  } else {
    updatedBindings = [...currentBindings, { type: 'd1', name: bindingName, id: databaseId }];
  }

  const patchRes = await fetch(`${CF_API_BASE}/accounts/${accountId}/workers/scripts/${workerName}/settings`, {
    method: 'PATCH',
    headers: cfHeaders(apiToken),
    body: JSON.stringify({
      bindings: updatedBindings,
    }),
  });

  const patchData = await patchRes.json();
  if (!patchData.success) {
    throw new Error(`Failed to add binding and redeploy: ${JSON.stringify(patchData.errors)}`);
  }

  console.log(`Successfully added D1 binding ${bindingName} for site ${siteId} and redeployed worker`);
  return true;
}

export async function listAllSiteDatabases(env) {
  const { apiToken, accountId } = getCredentials(env);

  const databases = [];
  let cursor = null;

  do {
    const params = new URLSearchParams({ per_page: '50' });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database?${params}`, {
      method: 'GET',
      headers: cfHeaders(apiToken),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(`Failed to list D1 databases: ${JSON.stringify(data.errors)}`);
    }

    databases.push(...(data.result || []));
    cursor = data.result_info?.cursor || null;
  } while (cursor);

  return databases.filter(db => db.name.startsWith('site-'));
}
