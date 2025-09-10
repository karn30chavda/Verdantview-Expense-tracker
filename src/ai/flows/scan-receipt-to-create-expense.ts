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
  amount: z.number().describe('The amount of the expense.'),
  date: z.string().describe('The date of the expense (YYYY-MM-DD).'),
  category: z.string().describe('The category of the expense.'),
  vendor: z.string().describe('The name of the vendor.'),
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
  prompt: `You are an expert AI assistant that extracts expense details from receipt images.

  Analyze the provided receipt image and extract the following information:
  - Amount: The total amount of the expense.
  - Date: The date of the expense (YYYY-MM-DD).
  - Category: The category of the expense (e.g., Groceries, Dining, Travel).
  - Vendor: The name of the vendor.

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
