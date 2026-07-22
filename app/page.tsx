"use client";

import { useEffect, useMemo, useState } from "react";

type Ordem = {
  id: string;
  numero: string;
  data: string;
  tipo_servico: string;
  status: string;
  maquina_id: string;
  maquina_nome?: string;
  ocorrencia?: string;
  servico_realizado?: string;
  observacoes?: string;
  pdf_url?: string;
  nota_fiscal_url?: string;
  pecas?: {
    quantidade: string | number;
    nome: string;
    descricao?: string;
  }[];
};

type Maquina = {
  id: string;
  nome: string;
  numero_serie: string;
  vazao?: string;
  horas_totais?: string;
  status?: string;
};

type PortalData = {
  cliente: {
    id: string;
    nome: string;
    contato?: string;
    cidade?: string;
    uf?: string;
  };
  maquinas: Maquina[];
  ordens: Ordem[];
  atualizado_em?: string;
};

const demo: PortalData = {
  cliente: { id: "964410b5", nome: "APE Malhas", contato: "Fabrício", cidade: "Blumenau", uf: "SC" },
  maquinas: [
    { id: "eb4df12b", nome: "CPC 60", numero_serie: "BRP085814", vazao: "7,4 m³/min", horas_totais: "9.680 h", status: "Operacional" },
    { id: "maq-02", nome: "CPM 40", numero_serie: "BRP074221", vazao: "5,2 m³/min", horas_totais: "6.245 h", status: "Operacional" },
  ],
  ordens: [
    { id: "8f7478bf", numero: "000002", data: "22/07/2026", tipo_servico: "Preventiva 8.000 h", status: "Concluída", maquina_id: "eb4df12b", maquina_nome: "CPC 60", ocorrencia: "Manutenção preventiva programada", servico_realizado: "Limpeza geral, engraxamento do motor e verificação de correias e conexões.", observacoes: "Equipamento liberado para operação.", pdf_url: "#", pecas: [
      { quantidade: 3, nome: "Óleo CP46 - 5L", descricao: "Utilizado meio galão do cliente" },
      { quantidade: 1, nome: "Filtro de ar", descricao: "Substituído durante a preventiva" },
      { quantidade: 1, nome: "Filtro de óleo", descricao: "Código 1031400226" },
      { quantidade: 1, nome: "Separador", descricao: "Substituição preventiva" },
    ] },
    { id: "os-001", numero: "000001", data: "13/07/2026", tipo_servico: "Inspeção técnica", status: "Concluída", maquina_id: "maq-02", maquina_nome: "CPM 40", ocorrencia: "Temperatura elevada", servico_realizado: "Inspeção e limpeza do sistema de arrefecimento." },
    { id: "os-003", numero: "000003", data: "28/07/2026", tipo_servico: "Preventiva 4.000 h", status: "Agendada", maquina_id: "eb4df12b", maquina_nome: "CPC 60" },
  ],
  atualizado_em: "22/07/2026 12:00",
};

function statusClass(status: string) {
  const text = status.toLowerCase();
  if (text.includes("conclu")) return "status done";
  if (text.includes("agend")) return "status scheduled";
  if (text.includes("andamento")) return "status progress";
  return "status pending";
}

export default function Home() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"visao" | "ordens" | "maquinas">("visao");
  const [selectedOrder, setSelectedOrder] = useState<Ordem | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Maquina | null>(null);
  const [filter, setFilter] = useState("Todas");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const demoMode = params.get("demo") === "1";

    if (demoMode) {
      setData(demo);
      setLoading(false);
      return;
    }

    if (!token) {
      setError("Link de acesso inválido ou incompleto.");
      setLoading(false);
      return;
    }

    fetch(`/api/portal?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Não foi possível carregar os dados deste cliente.");
        return response.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    if (filter === "Todas") return data.ordens;
    return data.ordens.filter(order => order.status === filter);
  }, [data, filter]);

  if (loading) {
    return <main className="center-state"><div className="spinner"/><p>Carregando seu portal...</p></main>;
  }

  if (error || !data) {
    return (
      <main className="center-state">
        <div className="state-icon">!</div>
        <h1>Acesso não encontrado</h1>
        <p>{error || "Não encontramos dados para este acesso."}</p>
        <small>Solicite um novo link à Consertar Compressores.</small>
      </main>
    );
  }

  const completed = data.ordens.filter(order => order.status.toLowerCase().includes("conclu")).length;
  const open = data.ordens.length - completed;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><img src="/logo-consertar.png" alt="Consertar Compressores"/><span>Portal do cliente</span></div>
        <div className="client-mini"><span>{data.cliente.nome.charAt(0)}</span><strong>{data.cliente.nome}</strong></div>
      </header>

      <main className="container">
        <section className="welcome">
          <div><p className="eyebrow">ÁREA DO CLIENTE</p><h1>Olá, {data.cliente.contato || data.cliente.nome}.</h1><p>Acompanhe seus equipamentos e relatórios de serviço em um só lugar.</p></div>
          <div className="updated">Atualizado em<br/><strong>{data.atualizado_em || "agora"}</strong></div>
        </section>

        <nav className="tabs" aria-label="Navegação do portal">
          <button className={tab === "visao" ? "active" : ""} onClick={() => setTab("visao")}>Visão geral</button>
          <button className={tab === "ordens" ? "active" : ""} onClick={() => setTab("ordens")}>Ordens de serviço</button>
          <button className={tab === "maquinas" ? "active" : ""} onClick={() => setTab("maquinas")}>Máquinas</button>
        </nav>

        {tab === "visao" && <>
          <section className="stats">
            <article><span className="stat-icon red">▣</span><div><small>Máquinas cadastradas</small><strong>{data.maquinas.length}</strong></div></article>
            <article><span className="stat-icon green">✓</span><div><small>Serviços concluídos</small><strong>{completed}</strong></div></article>
            <article><span className="stat-icon amber">◷</span><div><small>Em aberto ou agendados</small><strong>{open}</strong></div></article>
          </section>
          <SectionTitle title="Últimas ordens de serviço" action="Ver todas" onAction={() => setTab("ordens")}/>
          <OrderList orders={data.ordens.slice(0, 3)} onOpen={setSelectedOrder}/>
          <SectionTitle title="Seus equipamentos" action="Ver todos" onAction={() => setTab("maquinas")}/>
          <MachineGrid machines={data.maquinas.slice(0, 3)} orders={data.ordens} onOpen={setSelectedMachine}/>
        </>}

        {tab === "ordens" && <section>
          <div className="section-heading stack-mobile"><div><p className="eyebrow">HISTÓRICO</p><h2>Ordens de serviço</h2></div><div className="filters">{["Todas", "Concluída", "Agendada"].map(item => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
          <OrderList orders={filteredOrders} onOpen={setSelectedOrder}/>
        </section>}

        {tab === "maquinas" && <section>
          <div className="section-heading"><div><p className="eyebrow">EQUIPAMENTOS</p><h2>Máquinas cadastradas</h2></div></div>
          <MachineGrid machines={data.maquinas} orders={data.ordens} onOpen={setSelectedMachine}/>
        </section>}
      </main>

      <footer>Consertar Compressores · Portal PrevOS</footer>

      {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)}/>} 
      {selectedMachine && <MachineModal machine={selectedMachine} orders={data.ordens.filter(o => o.maquina_id === selectedMachine.id)} onClose={() => setSelectedMachine(null)} onOpenOrder={order => { setSelectedMachine(null); setSelectedOrder(order); }}/>} 
    </div>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return <div className="section-heading"><h2>{title}</h2><button className="text-button" onClick={onAction}>{action} →</button></div>;
}

function OrderList({ orders, onOpen }: { orders: Ordem[]; onOpen: (order: Ordem) => void }) {
  if (!orders.length) return <div className="empty">Nenhuma ordem de serviço encontrada.</div>;
  return <div className="order-list">{orders.map(order => <button className="order-row" key={order.id} onClick={() => onOpen(order)}><div className="order-number"><span>OS</span><strong>{order.numero}</strong></div><div className="order-main"><strong>{order.tipo_servico}</strong><span>{order.maquina_nome || "Equipamento"}</span></div><div className="order-date"><small>Data</small><span>{order.data || "—"}</span></div><span className={statusClass(order.status)}>{order.status || "Pendente"}</span><span className="arrow">›</span></button>)}</div>;
}

function MachineGrid({ machines, orders, onOpen }: { machines: Maquina[]; orders: Ordem[]; onOpen: (machine: Maquina) => void }) {
  return <div className="machine-grid">{machines.map(machine => <button className="machine-card" key={machine.id} onClick={() => onOpen(machine)}><div className="machine-top"><span className="machine-icon">◆</span><span className="status done">{machine.status || "Cadastrada"}</span></div><h3>{machine.nome}</h3><p>Série {machine.numero_serie}</p><dl><div><dt>Vazão</dt><dd>{machine.vazao || "—"}</dd></div><div><dt>Horas totais</dt><dd>{machine.horas_totais || "—"}</dd></div></dl><span className="card-link">{orders.filter(o => o.maquina_id === machine.id).length} ordens vinculadas →</span></button>)}</div>;
}

function OrderModal({ order, onClose }: { order: Ordem; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><article className="modal" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={onClose} aria-label="Fechar">×</button><p className="eyebrow">ORDEM DE SERVIÇO {order.numero}</p><div className="modal-title"><h2>{order.tipo_servico}</h2><span className={statusClass(order.status)}>{order.status}</span></div><div className="detail-grid"><div><small>Equipamento</small><strong>{order.maquina_nome || "—"}</strong></div><div><small>Data</small><strong>{order.data || "—"}</strong></div></div><div className="detail-block"><small>Ocorrência informada</small><p>{order.ocorrencia || "Não informada."}</p></div><div className="detail-block"><small>Serviço realizado</small><p>{order.servico_realizado || "Aguardando informações."}</p></div>{order.observacoes && <div className="detail-block"><small>Observações</small><p>{order.observacoes}</p></div>}<div className="parts-section"><div className="parts-heading"><small>PEÇAS UTILIZADAS</small><span>{order.pecas?.length || 0} itens</span></div>{order.pecas?.length ? <div className="parts-list">{order.pecas.map((peca, index) => <div className="part-row" key={`${peca.nome}-${index}`}><strong className="part-qty">{peca.quantidade}×</strong><div><strong>{peca.nome}</strong><span>{peca.descricao || "Sem descrição"}</span></div></div>)}</div> : <div className="parts-empty">Nenhuma peça registrada nesta ordem.</div>}</div><div className="modal-actions two-actions"><a className={!order.pdf_url ? "disabled" : ""} href={order.pdf_url || undefined} target="_blank" rel="noreferrer" aria-disabled={!order.pdf_url}>Visualizar PDF</a><a className={!order.nota_fiscal_url ? "secondary disabled" : "secondary"} href={order.nota_fiscal_url || undefined} target="_blank" rel="noreferrer" aria-disabled={!order.nota_fiscal_url}>Acessar nota fiscal <small>Em breve</small></a></div></article></div>;
}

function MachineModal({ machine, orders, onClose, onOpenOrder }: { machine: Maquina; orders: Ordem[]; onClose: () => void; onOpenOrder: (order: Ordem) => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><article className="modal wide" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={onClose} aria-label="Fechar">×</button><p className="eyebrow">EQUIPAMENTO</p><h2>{machine.nome}</h2><div className="detail-grid three"><div><small>Número de série</small><strong>{machine.numero_serie}</strong></div><div><small>Vazão</small><strong>{machine.vazao || "—"}</strong></div><div><small>Horas totais</small><strong>{machine.horas_totais || "—"}</strong></div></div><h3 className="modal-subtitle">Ordens deste equipamento</h3><OrderList orders={orders} onOpen={onOpenOrder}/></article></div>;
}
