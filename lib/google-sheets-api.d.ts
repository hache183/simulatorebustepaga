export interface ClientFogli {
  spreadsheets: {
    values: {
      get(params: {
        spreadsheetId: string;
        range: string;
      }): Promise<{ data: { values?: unknown[][] | null } }>;
      append(params: {
        spreadsheetId: string;
        range: string;
        valueInputOption: string;
        insertDataOption: string;
        requestBody: { values: string[][] };
      }): Promise<unknown>;
    };
  };
}

export function creaClientFogli(config: {
  clientEmail: string;
  privateKey: string;
}): ClientFogli;
