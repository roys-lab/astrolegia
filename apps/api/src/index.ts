import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import { prisma, UserRole } from '@astrolegia/database';
import { AssignRoleSchema, CapabilitiesSchema } from '@astrolegia/contracts';

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Platform', 'X-App-Version', 'X-App-Build', 'X-Api-Version'],
}));

app.use(express.json());

// Hello World Root
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Astrolegia Backend API',
    status: 'online',
    version: '1.0.0',
    message: 'Hello World from Astrolegia unified API backend!',
    timestamp: new Date().toISOString(),
  });
});

// Endpoint de Capacidades y Versionamiento
app.get('/v1/capabilities', (req: Request, res: Response) => {
  const capabilities = CapabilitiesSchema.parse({
    apiVersion: '1.0.0',
    minSupportedBuild: 1,
    latestBuild: 1,
    features: {
      pdfStreaming: true,
      googleSSO: true,
      adminRoleAssignment: true,
      natalChartCalculation: true,
    },
  });

  res.json({
    data: capabilities,
    meta: {
      requestId: `req_${Date.now()}`,
      timestamp: new Date().toISOString(),
    },
  });
});

// Microsistema Admin: Listar usuarios con sus roles
app.get('/v1/admin/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      data: users,
      meta: {
        total: users.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'No se pudieron recuperar los usuarios de la base de datos',
        details: error.message,
      },
    });
  }
});

// Microsistema Admin: Asignar rol a usuario por email
app.post('/v1/admin/users/assign-role', async (req: Request, res: Response) => {
  try {
    // 1. Validación estricta con esquema Zod de @astrolegia/contracts
    const parsed = AssignRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de asignación inválidos',
          details: parsed.error.format(),
        },
      });
    }

    const { email, role } = parsed.data;

    // 2. Persistencia en PostgreSQL vía Prisma
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: role as UserRole,
      },
      create: {
        email,
        role: role as UserRole,
        name: email.split('@')[0],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 3. Registro de auditoría inmutable
    try {
      await prisma.adminAudit.create({
        data: {
          actorId: user.id,
          action: 'user.role.assign',
          entityType: 'User',
          entityId: user.id,
          payload: { email, assignedRole: role },
          ipAddress: req.ip || '127.0.0.1',
        },
      });
    } catch (auditErr) {
      console.warn('Aviso: No se pudo registrar auditoría administrativa:', auditErr);
    }

    res.status(200).json({
      data: user,
      meta: {
        message: `Rol ${role} asignado exitosamente a ${email}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error al asignar rol:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno al procesar la asignación de rol',
        details: error.message,
      },
    });
  }
});

// Generación y Streaming de PDF en Runtime (Demostración)
app.get('/v1/astrology/natal-chart/sample/pdf', (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="astrolegia-sample-chart.pdf"');
    res.setHeader('Transfer-Encoding', 'chunked');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    // Encabezado
    doc.fontSize(24).fillColor('#2A1B4E').text('ASTROLEGIA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#64748B').text('Reporte Astrológico Generado en Runtime (Streaming Directo)', { align: 'center' });
    doc.moveDown(2);

    // Contenido
    doc.fontSize(12).fillColor('#0F172A');
    doc.text('Este documento PDF fue generado dinámicamente en la memoria RAM de la API backend de Astrolegia y transmitido por HTTP chunked streaming directo sin almacenamiento persistente en disco ni en buckets S3.');
    doc.moveDown(1);
    doc.text(`Fecha de Generación: ${new Date().toLocaleString()}`);
    doc.text('Sol: 12° Aries | Luna: 28° Cáncer | Ascendente: 04° Escorpio');
    doc.moveDown(2);

    // Gráfico vectorial simulado en PDF
    doc.lineWidth(2).strokeColor('#D4AF37').circle(300, 450, 100).stroke();
    doc.fontSize(10).fillColor('#D4AF37').text('Carta Natal Simbólica', 250, 445);

    doc.end();
  } catch (error: any) {
    console.error('Error generando stream de PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar streaming de PDF' });
    }
  }
});

const server = app.listen(port, () => {
  console.log(`✓ Astrolegia API escuchando en http://localhost:${port}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR FATAL] El puerto ${port} ya está ocupado por otra aplicación.`);
    console.error(`Por favor cierra la aplicación que esté utilizando el puerto ${port} e intenta nuevamente.\n`);
    process.exit(1);
  } else {
    console.error('Error en el servidor API:', err);
  }
});
