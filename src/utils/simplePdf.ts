import PDFDocument from "pdfkit";

const normalizeLine = (line: string): string => line.replace(/\s+/g, " ").trim();

export const createSimplePdf = async (lines: string[]): Promise<Buffer> =>
  await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: "A4",
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(11);
    lines
      .map(normalizeLine)
      .forEach((line) => {
        if (line === "") {
          doc.moveDown(0.5);
          return;
        }
        doc.text(line, { lineGap: 2 });
      });

    doc.end();
  });
