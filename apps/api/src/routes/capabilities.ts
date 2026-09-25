import { Router } from 'express';
import { CapabilitiesSchema } from '@astrolegia/contracts';
import { env } from '../env';
import { sendData } from '../http';

export const capabilitiesRouter = Router();

/** Endpoint obligatorio de negociación de capacidades (docs 02 y 13). */
capabilitiesRouter.get('/v1/capabilities', (req, res) => {
    const capabilities = CapabilitiesSchema.parse({
        apiVersion: '1.0.0',
        minSupportedBuild: 1,
        latestBuild: 1,
        features: {
            pdfStreaming: true,
            googleSSO: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
            adminRoleAssignment: true,
            natalChartCalculation: !!(env.RAPIDAPI_KEY && env.RAPIDAPI_HOST),
            natalProfiles: true,
            numerology: true,
            aiInterpretation: !!env.GEMINI_API_KEY,
            synastry: false,
            maintenanceMode: false,
        },
    });
    sendData(req, res, capabilities);
});
