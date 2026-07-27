import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HyperdriveBinding = {
  connectionString: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();

  if (!token) {
    return Response.json(
      { error: "Token de acesso não informado." },
      { status: 400 },
    );
  }

  let sql: ReturnType<typeof postgres> | undefined;

  try {
    const { env } = getCloudflareContext();

    // O cast é feito antes de acessar a propriedade, evitando o erro do TypeScript.
    const hyperdrive = (
      env as unknown as {
        HYPERDRIVE_PREVOS_NEON?: HyperdriveBinding;
      }
    ).HYPERDRIVE_PREVOS_NEON;

    if (!hyperdrive?.connectionString) {
      console.error("Portal: binding Hyperdrive ausente.", {
        binding: "HYPERDRIVE_PREVOS_NEON",
      });

      return Response.json(
        { error: "Banco de dados do portal não configurado." },
        { status: 500 },
      );
    }

    console.log("Portal: consultando cliente.", { token });

    sql = postgres(hyperdrive.connectionString, {
      max: 5,
      fetch_types: false,
      prepare: true,
    });

    const customers = await sql<{
      id: string;
      name: string;
      tax_id: string | null;
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      street: string | null;
      street_number: string | null;
      address_complement: string | null;
      city: string | null;
      state_code: string | null;
      postal_code: string | null;
      logo_url: string | null;
    }[]>`
      SELECT
        id,
        name,
        tax_id,
        contact_name,
        contact_email,
        contact_phone,
        street,
        street_number,
        address_complement,
        city,
        state_code,
        postal_code,
        logo_url
      FROM customers
      WHERE portal_token = ${token}
      LIMIT 1
    `;

    const customer = customers[0];

    if (!customer) {
      console.warn("Portal: token sem cliente correspondente.", { token });

      return Response.json(
        { error: "Cliente não encontrado." },
        { status: 404 },
      );
    }

    const machines = await sql<{
      id: string;
      name: string;
      serial_number: string | null;
      flow_rate_value: string | number | null;
      flow_rate_unit: string | null;
      photo_url: string | null;
      notes: string | null;
    }[]>`
      SELECT
        id,
        name,
        serial_number,
        flow_rate_value,
        flow_rate_unit,
        photo_url,
        notes
      FROM machines
      WHERE customer_id = ${customer.id}
      ORDER BY name ASC
    `;

    const workOrders = await sql<{
      id: string;
      report_number: string;
      machine_id: string;
      machine_name: string;
      technician_name: string | null;
      service_date: string;
      arrival_time: string | null;
      departure_time: string | null;
      total_km: string | number | null;
      service_type: string | null;
      reported_issue: string | null;
      service_performed: string | null;
      loaded_hours: string | number | null;
      unloaded_hours: string | number | null;
      operating_pressure_1: string | number | null;
      operating_pressure_2: string | number | null;
      ambient_temperature: string | number | null;
      temperature_before: string | number | null;
      temperature_after: string | number | null;
      voltage: string | null;
      intake_air_condition: string | null;
      air_filter_condition: string | null;
      compressor_oil: string | null;
      oil_level: string | null;
      notes: string | null;
      responsible_name: string | null;
      responsible_signature_url: string | null;
      status: string;
      pdf_status: string;
      pdf_view_url: string | null;
      invoice_url: string | null;
    }[]>`
      SELECT
        wo.id,
        wo.report_number,
        wo.machine_id,
        m.name AS machine_name,
        t.name AS technician_name,
        wo.service_date,
        wo.arrival_time,
        wo.departure_time,
        wo.total_km,
        wo.service_type,
        wo.reported_issue,
        wo.service_performed,
        wo.loaded_hours,
        wo.unloaded_hours,
        wo.operating_pressure_1,
        wo.operating_pressure_2,
        wo.ambient_temperature,
        wo.temperature_before,
        wo.temperature_after,
        wo.voltage,
        wo.intake_air_condition,
        wo.air_filter_condition,
        wo.compressor_oil,
        wo.oil_level,
        wo.notes,
        wo.responsible_name,
        wo.responsible_signature_url,
        wo.status,
        wo.pdf_status,
        wo.pdf_view_url,
        wo.invoice_url
      FROM work_orders wo
      INNER JOIN machines m ON m.id = wo.machine_id
      LEFT JOIN technicians t ON t.id = wo.technician_id
      WHERE wo.customer_id = ${customer.id}
      ORDER BY wo.service_date DESC, wo.report_number DESC
    `;

    const workOrderIds = workOrders.map((order) => order.id);

    const items =
      workOrderIds.length > 0
        ? await sql<{
            id: string;
            work_order_id: string;
            quantity: string | number;
            notes: string | null;
            product_id: string;
            product_name: string;
            product_photo_url: string | null;
          }[]>`
            SELECT
              woi.id,
              woi.work_order_id,
              woi.quantity,
              woi.notes,
              p.id AS product_id,
              p.name AS product_name,
              p.photo_url AS product_photo_url
            FROM work_order_items woi
            INNER JOIN products p ON p.id = woi.product_id
            WHERE woi.work_order_id = ANY(
              ${sql.array(workOrderIds, 2950)}
            )
            ORDER BY p.name ASC
          `
        : [];

    const itemsByWorkOrder = new Map<string, typeof items>();

    for (const item of items) {
      const currentItems = itemsByWorkOrder.get(item.work_order_id) ?? [];
      currentItems.push(item);
      itemsByWorkOrder.set(item.work_order_id, currentItems);
    }

    console.log("Portal: dados carregados com sucesso.", {
      customerId: customer.id,
      machines: machines.length,
      workOrders: workOrders.length,
      items: items.length,
    });

    return Response.json(
      {
        cliente: {
          id: customer.id,
          nome: customer.name,
          cnpj: customer.tax_id,
          contato: customer.contact_name,
          email: customer.contact_email,
          telefone: customer.contact_phone,
          endereco: {
            rua: customer.street,
            numero: customer.street_number,
            complemento: customer.address_complement,
            cidade: customer.city,
            uf: customer.state_code,
            cep: customer.postal_code,
          },
          logo_url: customer.logo_url,
        },

        maquinas: machines.map((machine) => ({
          id: machine.id,
          nome: machine.name,
          numero_serie: machine.serial_number,
          vazao: machine.flow_rate_value,
          unidade_vazao: machine.flow_rate_unit,
          foto_url: machine.photo_url,
          observacoes: machine.notes,
        })),

        ordens: workOrders.map((order) => ({
          id: order.id,
          numero_relatorio: order.report_number,
          maquina_id: order.machine_id,
          maquina: order.machine_name,
          tecnico: order.technician_name,
          data_servico: order.service_date,
          hora_chegada: order.arrival_time,
          hora_saida: order.departure_time,
          km_total: order.total_km,
          tipo_servico: order.service_type,
          ocorrencia_informada: order.reported_issue,
          servico_realizado: order.service_performed,
          horas_em_carga: order.loaded_hours,
          horas_em_alivio: order.unloaded_hours,
          pressao_trabalho_1: order.operating_pressure_1,
          pressao_trabalho_2: order.operating_pressure_2,
          temperatura_ambiente: order.ambient_temperature,
          temperatura_anterior: order.temperature_before,
          temperatura_atual: order.temperature_after,
          tensao: order.voltage,
          condicao_ar_aspirado: order.intake_air_condition,
          condicao_filtro_ar: order.air_filter_condition,
          oleo_compressor: order.compressor_oil,
          nivel_oleo: order.oil_level,
          observacoes: order.notes,
          responsavel: order.responsible_name,
          assinatura_responsavel_url: order.responsible_signature_url,
          status: order.status,
          status_pdf: order.pdf_status,
          pdf_url: order.pdf_view_url,
          nota_fiscal_url: order.invoice_url,
          pecas: (itemsByWorkOrder.get(order.id) ?? []).map((item) => ({
            id: item.id,
            produto_id: item.product_id,
            nome: item.product_name,
            quantidade: item.quantity,
            observacoes: item.notes,
            foto_url: item.product_photo_url,
          })),
        })),

        atualizado_em: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Portal: erro ao carregar dados.", {
      token,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return Response.json(
      { error: "Não foi possível carregar os dados deste cliente." },
      { status: 500 },
    );
  } finally {
    if (sql) {
      await sql.end({ timeout: 1 });
    }
  }
}
