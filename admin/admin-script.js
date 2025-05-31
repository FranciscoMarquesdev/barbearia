// Sistema de Autenticação e Painel Administrativo

// Dados de login (em produção, isso viria de um backend seguro)
const adminCredentials = {
  username: "admin",
  password: "123456",
};

// Inicialização do painel administrativo
document.addEventListener("DOMContentLoaded", function () {
  checkAuthStatus();
  setupLoginForm();
  setupNavigation();
  setupFilters();
  loadDashboardData();
  loadAppointmentsData();
});

// Sistema de Autenticação
function checkAuthStatus() {
  const isLoggedIn = localStorage.getItem("adminLoggedIn") === "true";
  if (isLoggedIn) {
    showDashboard();
  } else {
    showLoginScreen();
  }
}

function setupLoginForm() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      if (
        username === adminCredentials.username &&
        password === adminCredentials.password
      ) {
        localStorage.setItem("adminLoggedIn", "true");
        showDashboard();
      } else {
        alert("Usuário ou senha incorretos!");
      }
    });
  }
}

function showLoginScreen() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("adminDashboard").style.display = "none";
}

function showDashboard() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminDashboard").style.display = "grid";
  updateNotificationCount();
}

function logout() {
  localStorage.removeItem("adminLoggedIn");
  showLoginScreen();
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

// Navegação
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      navItems.forEach((nav) => nav.classList.remove("active"));
      this.classList.add("active");
      const section = this.dataset.section;
      showSection(section);
    });
  });
}

function showSection(sectionName) {
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });
  document.getElementById(sectionName).classList.add("active");
  switch (sectionName) {
    case "dashboard":
      loadDashboardData();
      break;
    case "appointments":
      loadAppointmentsData();
      break;
    case "cancellations":
      loadCancellationsData();
      break;
    case "financial":
      loadFinancialData();
      break;
    case "notifications":
      loadNotificationsData();
      break;
  }
}

// Filtros
function setupFilters() {
  const dashboardPeriod = document.getElementById("dashboardPeriod");
  if (dashboardPeriod) {
    dashboardPeriod.addEventListener("change", loadDashboardData);
  }
  [
    "appointmentDateFilter",
    "appointmentProfessionalFilter",
    "appointmentStatusFilter",
  ].forEach((filterId) => {
    const filter = document.getElementById(filterId);
    if (filter) {
      filter.addEventListener("change", loadAppointmentsData);
    }
  });
  const cancellationFilter = document.getElementById("cancellationDateFilter");
  if (cancellationFilter) {
    cancellationFilter.addEventListener("change", loadCancellationsData);
  }
  const financialPeriod = document.getElementById("financialPeriod");
  if (financialPeriod) {
    financialPeriod.addEventListener("change", loadFinancialData);
  }
}

// Dashboard
function loadDashboardData() {
  fetch("http://localhost:3000/api/agendamentos")
    .then((res) => res.json())
    .then((agendamentos) => {
      const period =
        document.getElementById("dashboardPeriod")?.value || "today";
      // Filtra pelo período, mas NÃO remove cancelados ainda
      const filteredData = filterDataByPeriod(agendamentos, period);

      // Conta todos os agendamentos não cancelados
      const totalAppointments = filteredData.filter(
        (a) => a.status !== "cancelado"
      ).length;

      // Conta todos os atendidos
      const completedAppointments = filteredData.filter(
        (a) => a.status === "completed"
      ).length;

      // Conta todos os cancelados
      const lidos = JSON.parse(
        localStorage.getItem("cancelamentosLidos") || "[]"
      );
      const cancelledAppointments = filteredData.filter(
        (a) => a.status === "cancelado" && !lidos.includes(a.id)
      ).length;

      // Faturamento só dos não cancelados
      const totalRevenue = filteredData
        .filter((a) => a.status !== "cancelado")
        .reduce((sum, a) => sum + Number(a.preco), 0);

      document.getElementById("totalAppointments").textContent =
        totalAppointments;
      document.getElementById("completedAppointments").textContent =
        completedAppointments;
      document.getElementById("cancelledAppointments").textContent =
        cancelledAppointments;
      document.getElementById(
        "totalRevenue"
      ).textContent = `R$ ${totalRevenue.toFixed(2)}`;

      renderRevenueChart(filteredData, period);
    });
}

// Agendamentos
function loadAppointmentsData() {
  fetch("http://localhost:3000/api/agendamentos")
    .then((res) => res.json())
    .then((agendamentos) => {
      // Filtros
      const dateFilter =
        document.getElementById("appointmentDateFilter")?.value || "all";
      const professionalFilter =
        document.getElementById("appointmentProfessionalFilter")?.value ||
        "all";
      const statusFilter =
        document.getElementById("appointmentStatusFilter")?.value || "all";
      let filtered = [...agendamentos];

      // Sempre remova os cancelados da lista principal, a não ser que o filtro peça especificamente
      if (statusFilter === "all") {
        filtered = filtered.filter((a) => a.status !== "cancelado");
      } else {
        filtered = filtered.filter((a) => a.status === statusFilter);
      }

      if (dateFilter !== "all")
        filtered = filterDataByPeriod(filtered, dateFilter);
      if (professionalFilter !== "all")
        filtered = filtered.filter(
          (a) => a.profissional === professionalFilter
        );

      const tbody = document.getElementById("appointmentsTableBody");
      tbody.innerHTML = "";
      filtered.forEach((ag) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${ag.nome}</td>
          <td>${ag.servico}</td>
          <td>${ag.profissional}</td>
          <td>${ag.data} ${ag.horario}</td>
          <td>R$ ${ag.preco}</td>
          <td>${getStatusText(ag.status)}</td>
          <td>
            ${
              ag.status !== "cancelado" && ag.status !== "completed"
                ? `<button onclick="marcarComoAtendido(${ag.id})">Atender</button>`
                : ""
            }
            ${
              ag.status !== "cancelado"
                ? `<button onclick="cancelarAgendamento(${ag.id})">Cancelar</button>`
                : ""
            }
          </td>
        `;
        tbody.appendChild(tr);
      });
    });
}

function cancelarAgendamento(id) {
  fetch("http://localhost:3000/api/cancelar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).then(() => loadAppointmentsData());
}

function marcarComoAtendido(id) {
  fetch("http://localhost:3000/api/atender", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).then(() => loadAppointmentsData());
}

// Cancelamentos
function loadCancellationsData() {
  fetch("http://localhost:3000/api/agendamentos")
    .then((res) => res.json())
    .then((agendamentos) => {
      const cancelled = agendamentos.filter((a) => a.status === "cancelado");
      // Filtra cancelamentos já limpos
      const lidos = JSON.parse(
        localStorage.getItem("cancelamentosLidos") || "[]"
      );
      const novosCancelamentos = cancelled.filter((a) => !lidos.includes(a.id));
      renderCancellationsTable(novosCancelamentos);
    });
}

function renderCancellationsTable(data) {
  const tbody = document.getElementById("cancellationsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  data.forEach((cancellation) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cancellation.nome}</td>
      <td>${cancellation.servico}</td>
      <td>${cancellation.profissional}</td>
      <td>${cancellation.data} ${cancellation.horario}</td>
      <td>${
        cancellation.cancelledAt
          ? formatDateTime(cancellation.cancelledAt, "")
          : ""
      }</td>
      <td>R$ ${cancellation.preco}</td>
    `;
    tbody.appendChild(row);
  });
}

// Financeiro
function loadFinancialData() {
  const period = document.getElementById("financialPeriod")?.value || "today";
  fetch("http://localhost:3000/api/agendamentos")
    .then((res) => res.json())
    .then((agendamentos) => {
      // Filtra cancelados ANTES de filtrar por período
      const filteredData = filterDataByPeriod(
        agendamentos.filter((a) => a.status !== "cancelado"),
        period
      );
      const totalRevenue = filteredData.reduce(
        (sum, apt) => sum + Number(apt.preco),
        0
      );
      const totalAppointments = filteredData.length;
      const averageTicket =
        totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

      document.getElementById(
        "totalFinancialRevenue"
      ).textContent = `R$ ${totalRevenue.toFixed(2)}`;
      document.getElementById("totalFinancialAppointments").textContent =
        totalAppointments;
      document.getElementById(
        "averageTicket"
      ).textContent = `R$ ${averageTicket.toFixed(2)}`;

      renderProfessionalRevenueTable(filteredData);
      renderServiceRevenueTable(filteredData);
    });
}

function renderProfessionalRevenueTable(data) {
  const tbody = document.getElementById("professionalRevenueTable");
  if (!tbody) return;
  const professionalStats = {};
  data.forEach((apt) => {
    if (!professionalStats[apt.profissional]) {
      professionalStats[apt.profissional] = { count: 0, revenue: 0 };
    }
    professionalStats[apt.profissional].count++;
    professionalStats[apt.profissional].revenue += Number(apt.preco);
  });
  tbody.innerHTML = "";
  Object.entries(professionalStats).forEach(([professional, stats]) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${professional}</td>
      <td>${stats.count}</td>
      <td>R$ ${stats.revenue.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderServiceRevenueTable(data) {
  const tbody = document.getElementById("serviceRevenueTable");
  if (!tbody) return;
  const serviceStats = {};
  data.forEach((apt) => {
    if (!serviceStats[apt.servico]) {
      serviceStats[apt.servico] = { count: 0, revenue: 0 };
    }
    serviceStats[apt.servico].count++;
    serviceStats[apt.servico].revenue += Number(apt.preco);
  });
  tbody.innerHTML = "";
  Object.entries(serviceStats).forEach(([service, stats]) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${service}</td>
      <td>${stats.count}</td>
      <td>R$ ${stats.revenue.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

// Notificações (simples: mostra agendamentos recentes)
function loadNotificationsData() {
  fetch("http://localhost:3000/api/agendamentos")
    .then((res) => res.json())
    .then((agendamentos) => {
      const container = document.getElementById("notificationsContainer");
      if (!container) return;
      container.innerHTML = "";

      // Filtra notificações já limpas
      const lidas = JSON.parse(
        localStorage.getItem("notificacoesLidas") || "[]"
      );
      const novas = agendamentos.filter((ag) => !lidas.includes(ag.id));

      novas
        .slice(-10)
        .reverse()
        .forEach((ag) => {
          const notificationElement = document.createElement("div");
          notificationElement.className = "notification-item";
          notificationElement.innerHTML = `
            <div class="notification-header">
              <span class="notification-type">${
                ag.status === "cancelado" ? "Cancelamento" : "Novo Agendamento"
              }</span>
              <span class="notification-time">${ag.data} ${ag.horario}</span>
            </div>
            <div class="notification-message">
              ${ag.nome} - ${ag.servico} com ${ag.profissional}
            </div>
          `;
          container.appendChild(notificationElement);
        });
    });
}

function updateNotificationCount() {
  fetch("http://localhost:3000/api/agendamentos")
    .then((res) => res.json())
    .then((agendamentos) => {
      const countElement = document.getElementById("notificationCount");
      if (countElement) {
        const unreadCount = agendamentos.filter(
          (a) => a.status !== "cancelado"
        ).length;
        countElement.textContent = unreadCount;
        countElement.style.display = unreadCount > 0 ? "flex" : "none";
      }
    });
}

function clearAllNotifications() {
  // Salva os IDs das notificações atuais como "limpas"
  fetch("http://localhost:3000/api/agendamentos")
    .then((res) => res.json())
    .then((agendamentos) => {
      const ids = agendamentos.map((a) => a.id);
      localStorage.setItem("notificacoesLidas", JSON.stringify(ids));
      renderNotifications();
      updateNotificationCount();
      closeModal();
    });
}

function clearAllCancellations() {
  fetch("http://localhost:3000/api/agendamentos")
    .then((res) => res.json())
    .then((agendamentos) => {
      const cancelled = agendamentos.filter((a) => a.status === "cancelado");
      const ids = cancelled.map((a) => a.id);
      localStorage.setItem("cancelamentosLidos", JSON.stringify(ids));
      loadCancellationsData();
      closeModal();
    });
}

// Funções auxiliares
function filterDataByPeriod(data, period) {
  if (period === "all") return data;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "today":
      return data.filter((item) => {
        if (!item.data) return false;
        const [year, month, day] = item.data.split("-");
        const itemDate = new Date(Number(year), Number(month) - 1, Number(day));
        return (
          itemDate >= today &&
          itemDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        );
      });
    case "week":
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return data.filter((item) => {
        const [year, month, day] = item.data.split("-");
        const itemDate = new Date(Number(year), Number(month) - 1, Number(day));
        return itemDate >= weekStart && itemDate < weekEnd;
      });
    case "month":
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return data.filter((item) => {
        const [year, month, day] = item.data.split("-");
        const itemDate = new Date(Number(year), Number(month) - 1, Number(day));
        return itemDate >= monthStart && itemDate < monthEnd;
      });
    default:
      return data;
  }
}
// }

function formatDateTime(date, time) {
  if (!date) return "";
  const dateObj = new Date(date);
  const day = dateObj.getDate().toString().padStart(2, "0");
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}${time ? " às " + time : ""}`;
}

function getStatusText(status) {
  const statusMap = {
    confirmed: "Confirmado",
    completed: "Atendido",
    "no-show": "Não Compareceu",
    cancelado: "Cancelado",
  };
  return statusMap[status] || status;
}

// Modal (mantido para compatibilidade)
function showConfirmModal(title, message, onConfirm) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalMessage").textContent = message;
  const confirmBtn = document.getElementById("modalConfirmBtn");
  confirmBtn.onclick = onConfirm;
  document.getElementById("confirmModal").classList.add("active");
}

function closeModal() {
  document.getElementById("confirmModal").classList.remove("active");
}

// Menu mobile responsivo
document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("mobileMenuBtn");
  const menu = document.getElementById("mobileMenuList");
  if (btn && menu) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove("open");
      }
    });
    menu.querySelectorAll("a[data-section]").forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        menu.classList.remove("open");

        // Remove active de todos os nav-items (sidebar e mobile)
        document
          .querySelectorAll(".nav-item")
          .forEach((nav) => nav.classList.remove("active"));

        // Adiciona active no item clicado (mobile)
        this.classList.add("active");

        // Adiciona active no item correspondente da sidebar
        const section = this.getAttribute("data-section");
        document
          .querySelectorAll(`.nav-item[data-section="${section}"]`)
          .forEach((el) => el.classList.add("active"));

        // Mostra a seção correspondente
        showSection(section);
      });
    });
  }
});

function renderRevenueChart(data, period) {
  const ctx = document.getElementById("weeklyRevenueChart");
  if (!ctx) return;

  // Destrua o gráfico anterior se existir
  if (window.revenueChart) {
    window.revenueChart.destroy();
  }

  let labels = [];
  let values = [];

  if (period === "today") {
    // Faturamento por hora
    labels = Array.from(
      { length: 24 },
      (_, i) => `${i.toString().padStart(2, "0")}:00`
    );
    values = Array(24).fill(0);
    data.forEach((apt) => {
      if (apt.status !== "cancelado") {
        const hora = parseInt(apt.horario.split(":")[0], 10);
        values[hora] += Number(apt.preco);
      }
    });
  } else if (period === "week") {
    // Faturamento por dia da semana
    labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    values = Array(7).fill(0);
    data.forEach((apt) => {
      if (apt.status !== "cancelado") {
        const [year, month, day] = apt.data.split("-");
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        const diaSemana = date.getDay();
        values[diaSemana] += Number(apt.preco);
      }
    });
  } else if (period === "month") {
    // Faturamento por dia do mês
    const diasNoMes = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    labels = Array.from({ length: diasNoMes }, (_, i) => (i + 1).toString());
    values = Array(diasNoMes).fill(0);
    data.forEach((apt) => {
      if (apt.status !== "cancelado") {
        const [year, month, day] = apt.data.split("-");
        const dia = Number(day) - 1;
        values[dia] += Number(apt.preco);
      }
    });
  }

  window.revenueChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Faturamento (R$)",
          data: values,
          backgroundColor: "rgba(102, 126, 234, 0.8)",
          borderColor: "rgba(102, 126, 234, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => "R$ " + value,
          },
        },
      },
    },
  });
}
