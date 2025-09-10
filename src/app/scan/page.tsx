'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  scanReceiptToCreateExpense,
  ScanReceiptToCreateExpenseOutput,
} from '@/ai/flows/scan-receipt-to-create-expense';
import { ExpenseForm } from '@/components/expense-form';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function ScanPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedData, setScannedData] = useState<ScanReceiptToCreateExpenseOutput | null>(null);
  const { toast } = useToast();
  const receiptPlaceholder = PlaceHolderImages.find(img => img.id === 'receipt-scan-placeholder');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImagePreview(dataUri);
        handleScan(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async (photoDataUri: string) => {
    setIsLoading(true);
    setScannedData(null);
    try {
      const result = await scanReceiptToCreateExpense({ photoDataUri });
      setScannedData(result);
      toast({
        title: 'Scan successful!',
        description: 'Please review the extracted information below.',
      });
    } catch (error) {
      console.error('AI scan failed:', error);
      toast({
        title: 'Scan Failed',
        description: 'Could not extract information from the image. Please try another image or enter manually.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetScanner = () => {
    setImagePreview(null);
    setScannedData(null);
    setIsLoading(false);
  }

  if (scannedData) {
    return (
      <div className="container mx-auto max-w-4xl py-10">
        <Card>
            <CardHeader>
              <CardTitle>Review Scanned Expense</CardTitle>
              <CardDescription>
                Our AI has extracted the following details from your receipt. Please verify and save.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                 <ExpenseForm expense={{
                    title: scannedData.vendor || 'Scanned Expense',
                    amount: scannedData.amount || 0,
                    date: scannedData.date ? new Date(scannedData.date).toISOString() : new Date().toISOString(),
                    category: scannedData.category || 'Other',
                    paymentMode: 'Card',
                }}/>
                 <Button variant="outline" onClick={resetScanner} className="w-full">Scan Another Receipt</Button>
              </div>
              {imagePreview && (
                <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden border">
                   <Image src={imagePreview} alt="Receipt preview" layout="fill" objectFit="contain" />
                </div>
              )}
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>AI Expense Scanner</CardTitle>
          <CardDescription>
            Upload an image of your receipt, and our AI will automatically fill in the details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg">
                {isLoading ? (
                    <div className="text-center">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                        <p className="mt-4 font-medium">Scanning your receipt...</p>
                        <p className="text-sm text-muted-foreground">This may take a moment.</p>
                    </div>
                ) : imagePreview ? (
                    <div className="relative w-full max-h-[60vh] aspect-[9/16]">
                        <Image src={imagePreview} alt="Receipt preview" layout="fill" objectFit="contain" className="rounded-md" />
                    </div>
                ) : (
                    <>
                    <UploadCloud className="h-12 w-12 text-muted-foreground" />
                    <Label htmlFor="receipt-upload" className="mt-4 text-lg font-semibold text-primary cursor-pointer">
                        Click to upload or drag and drop
                    </Label>
                    <p className="text-sm text-muted-foreground">PNG, JPG, or WEBP</p>
                    <Input id="receipt-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                    </>
                )}
            </div>
             {receiptPlaceholder && (
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border mt-4 opacity-50">
                   <Image src={receiptPlaceholder.imageUrl} alt={receiptPlaceholder.description} layout="fill" objectFit="cover" data-ai-hint={receiptPlaceholder.imageHint} />
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
