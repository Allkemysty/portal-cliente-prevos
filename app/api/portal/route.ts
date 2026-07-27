import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Client } from "pg";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token ausente" }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
  });

  try {
    await client.connect();

    const customerResult = await client.query(
      `
        SELECT
          id, name, contact_name, contact_email, contact_phone,
          street, street_number, city, state_code, postal_code
        FROM customers
        WHERE portal_token = $1
        LIMIT 1
      `,
      [token],
    );

    const customer = customerResult.rows[0];

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    const machinesResult = await client.query(
      `
        SELECT
          id, name, serial_number, flow_rate_value, flow_rate_unit, notes
        FROM machines
        WHERE customer_id = $1
        ORDER BY name
      `,
      [customer.id],
    );

    const ordersResult = await client.query(
      `
        SELECT
          wo.id,
          wo.report_number,
          wo.service_date,
          wo.service_type,
          wo.status,
          wo.pdf_status,
          wo.pdf_view_url,
          wo.invoice_url,
          wo.reported_issue,
          wo.service_performed,
          wo.notes,
          wo.responsible_name,

          m.id AS machine_id,
          m.name AS machine_name,
          m.serial_number AS machine_serial_number,

          t.name AS technician_name,

          COALESCE(
            json_agg(
              json_build_object(
                'id', woi.id,
                'quantity', woi.quantity,
                'name', p.name,
                'notes', woi.notes
              )
            ) FILTER (WHERE woi.id IS NOT NULL),
            '[]'::json
          ) AS materials

        FROM work_orders wo
        INNER JOIN machines m ON m.id = wo.machine_id
        LEFT JOIN technicians t ON t.id = wo.technician_id
        LEFT JOIN work_order_items woi ON woi.work_order_id = wo.id
        LEFT JOIN products p ON p.id = woi.product_id

        WHERE wo.customer_id = $1

        GROUP BY wo.id, m.id, t.id
        ORDER BY wo.service_date DESC, wo.created_at DESC
      `,
      [customer.id],
    );

    return NextResponse.json(
      {
        cliente: {
          id: customer.id,
          nome: customer.name,
          contato: customer.contact_name,
          email: customer.contact_email,
          telefone: customer.contact_phone,
          endereco: {
            rua: customer.street,
            numero: customer.street_number,
            cidade: customer.city,
            uf: customer.state_code,
            cep: customer.postal_code,
          },
        },

        maquinas: machinesResult.rows.map((machine) => ({
          id: machine.id,
          nome: machine.name,
          numero_serie: machine.serial_number,
          vazao:
            machine.flow_rate_value !== null
              ? `${machine.flow_rate_value} ${machine.flow_rate_unit}`
              : null,
          observacoes: machine.notes,
        })),

        ordens: ordersResult.rows.map((order) => ({
          id: order.id,
          numero: order.report_number,
          data: order.service_date,
          tipo_servico: order.service_type,
          status: order.status,
          status_pdf: order.pdf_status,
          pdf_url: order.pdf_view_url,
          nota_fiscal_url: order.invoice_url,
          ocorrencia: order.reported_issue,
          servico_realizado: order.service_performed,
          observacoes: order.notes,
          responsavel: order.responsible_name,
          tecnico: order.technician_name,
          maquina: {
            id: order.machine_id,
            nome: order.machine_name,
            numero_serie: order.machine_serial_number,
          },
          materiais: order.materials,
        })),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Erro ao consultar o Neon:", error);

    return NextResponse.json(
      { error: "Falha ao consultar dados do portal" },
      { status: 502 },
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}
