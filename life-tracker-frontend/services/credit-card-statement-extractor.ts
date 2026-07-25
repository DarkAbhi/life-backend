import { GoogleGenAI, Type } from "@google/genai";

export interface StatementTransaction {
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
}

export interface CreditCardStatementResult {
  accountNumber?: string;
  totalDebits?: number;
  totalCredits?: number;
  transactions: StatementTransaction[];
}

export interface ExtractOptions {
  apiKey?: string;
  model?: string;
}

/**
 * Service to extract credit card statement transactions and summary from a PDF file using Google Gemini Gen AI.
 * 
 * @param file - The browser File or Blob object uploaded by the user.
 * @param options - Optional configuration including custom API key or Gemini model.
 * @returns Parsed credit card statement result containing summary and transactions list.
 */
export async function extractCreditCardStatementData(
  file: File | Blob,
  options?: ExtractOptions
): Promise<CreditCardStatementResult> {
  const apiKey = options?.apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  const ai = new GoogleGenAI({
    ...(apiKey ? { apiKey } : {}),
  });

  // 1. Upload the PDF file using Google Gen AI Files API (supports browser File/Blob)
  const mimeType = file.type || "application/pdf";
  const uploadResult = await ai.files.upload({
    file: file as any,
    config: {
      mimeType: mimeType,
    },
  });

  // 2. Enforce JSON response schema
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      accountNumber: { type: Type.STRING },
      totalDebits: { type: Type.NUMBER },
      totalCredits: { type: Type.NUMBER },
      transactions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ["debit", "credit"] },
          },
          required: ["date", "description", "amount", "type"],
        },
      },
    },
    required: ["transactions"],
  };

  // 3. Request structured content generation from Gemini model
  const modelName = options?.model || "gemini-2.5-flash";
  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      uploadResult,
      "Extract all transaction details and account summary from this PDF statement.",
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  if (!response.text) {
    throw new Error("No response content received from Gemini model.");
  }

  const parsedData = JSON.parse(response.text) as CreditCardStatementResult;
  return parsedData;
}
