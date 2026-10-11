const GATEWAY_URL = "https://connector-gateway.lovable.dev/salesforce";

function headers() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const sf = process.env["SALESFORCE_API_KEY"];
  if (!lovable || !sf) throw new Error("Salesforce connection is not configured");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": sf,
    "Content-Type": "application/json",
  };
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.text();
    console.error(`Salesforce request failed [${res.status}]: ${body}`);
    throw new Error(`Salesforce request failed [${res.status}]`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function sfQuery<T>(soql: string): Promise<T[]> {
  const res = await fetch(`${GATEWAY_URL}/query?q=${encodeURIComponent(soql)}`, { headers: headers() });
  const json = (await handle(res)) as { records: T[] };
  return json.records;
}

export async function sfCreate(object: string, data: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${GATEWAY_URL}/sobjects/${object}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  const json = (await handle(res)) as { id: string };
  return json.id;
}

export const SF_ID = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/;

/** Escape a value for use in a SOQL string literal. */
export function soqlString(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
