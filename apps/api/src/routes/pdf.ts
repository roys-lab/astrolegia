import { Router } from 'express';
import PDFDocument from 'pdfkit';

/**
 * Demostración de generación y streaming de PDF en runtime (doc 09): el
 * documento se arma en memoria y se transmite por chunks, sin buckets.
 */
export const pdfRouter = Router();

pdfRouter.get('/v1/astrology/natal-chart/sample/pdf', (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="astrolegia-sample-chart.pdf"');
        res.setHeader('Transfer-Encoding', 'chunked');

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        doc.pipe(res);

        doc.fontSize(24).fillColor('#2A1B4E').text('ASTROLEGIA', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor('#64748B').text('Reporte Astrológico Generado en Runtime (Streaming Directo)', { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(12).fillColor('#0F172A');
        doc.text('Este documento PDF fue generado dinámicamente en la memoria RAM de la API backend de Astrolegia y transmitido por HTTP chunked streaming directo sin almacenamiento persistente en disco ni en buckets S3.');
        doc.moveDown(1);
        doc.text(`Fecha de Generación: ${new Date().toLocaleString()}`);
        doc.text('Sol: 12° Aries | Luna: 28° Cáncer | Ascendente: 04° Escorpio');
        doc.moveDown(2);

        doc.lineWidth(2).strokeColor('#D4AF37').circle(300, 450, 100).stroke();
        doc.fontSize(10).fillColor('#D4AF37').text('Carta Natal Simbólica', 250, 445);

        doc.end();
    } catch (error) {
        console.error(`[${req.requestId}] Error generando stream de PDF:`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error al generar streaming de PDF' }, meta: { requestId: req.requestId, timestamp: new Date().toISOString() } });
        }
    }
});
