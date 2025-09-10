'use server';
/**
 * @fileOverview This file defines a Genkit flow for scanning receipt images to extract expense details.
 *
 * - scanReceiptToCreateExpense - A function that takes a receipt image and extracts expense details.
 * - ScanReceiptToCreateExpenseInput - The input type for the scanReceiptToCreateExpense function.
 * - ScanReceiptToCreateExpenseOutput - The return type for the scanReceiptToCreateExpense function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScanReceiptToCreateExpenseInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanReceiptToCreateExpenseInput = z.infer<
  typeof ScanReceiptToCreateExpenseInputSchema
>;

const ScanReceiptToCreateExpenseOutputSchema = z.object({
  amount: z.number().describe('The total amount of the expense.'),
  date: z.string().describe('The date of the expense (YYYY-MM-DD). If not found, use today\'s date.'),
  category: z.string().describe('The category of the expense (e.g., Groceries, Dining, Travel). If not clear, use "Other".'),
  vendor: z.string().describe('The name of the vendor or store.'),
});
export type ScanReceiptToCreateExpenseOutput = z.infer<
  typeof ScanReceiptToCreateExpenseOutputSchema
>;

export async function scanReceiptToCreateExpense(
  input: ScanReceiptToCreateExpenseInput
): Promise<ScanReceiptToCreateExpenseOutput> {
  return scanReceiptToCreateExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanReceiptToCreateExpensePrompt',
  input: {schema: ScanReceiptToCreateExpenseInputSchema},
  output: {schema: ScanReceiptToCreateExpenseOutputSchema},
  prompt: `You are an expert AI assistant that extracts expense details from receipt images or documents.

  Analyze the provided receipt image and extract the following information:
  - Amount: The total amount of the expense. This is usually labeled "Total", "Grand Total", or "Amount Due".
  - Date: The date of the expense. Format it as YYYY-MM-DD. If you cannot find a date, use the current date.
  - Category: Infer a likely category for the expense from the vendor name or items (e.g., Groceries, Dining, Travel, Utilities). If you are unsure, default to "Other".
  - Vendor: The name of the vendor, store, or merchant.

  Return the extracted information in JSON format.

  Receipt Image: {{media url=photoDataUri}}
  `,
});

const scanReceiptToCreateExpenseFlow = ai.defineFlow(
  {
    name: 'scanReceiptToCreateExpenseFlow',
    inputSchema: ScanReceiptToCreateExpenseInputSchema,
    outputSchema: ScanReceiptToCreateExpenseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
