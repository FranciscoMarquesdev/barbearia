// Estado da aplicação
let currentStep = 1;
let bookingData = {
  clientName: "",
  clientPhone: "",
  professional: "",
  service: "",
  price: 0,
  date: "",
  time: "",
};

// Horários disponíveis (simulação)
const availableSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

// Horários ocupados (simulação - em um app real viria do backend)
const occupiedSlots = {
  "2024-01-15": ["09:00", "14:30", "16:00"],
  "2024-01-16": ["10:00", "15:30"],
  // Adicione mais datas conforme necessário
};

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  initializeDatePicker();
  setupEventListeners();
  updateProgress();
});

function initializeDatePicker() {
  const dateInput = document.getElementById("appointmentDate");
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 30); // 30 dias no futuro

  dateInput.min = today.toISOString().split("T")[0];
  dateInput.max = maxDate.toISOString().split("T")[0];

  dateInput.addEventListener("change", generateTimeSlots);
}

function setupEventListeners() {
  // Máscara para telefone
  const phoneInput = document.getElementById("clientPhone");
  phoneInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    e.target.value = value;
  });

  // Seleção de profissionais
  document.querySelectorAll(".professional-card").forEach((card) => {
    card.addEventListener("click", function () {
      document
        .querySelectorAll(".professional-card")
        .forEach((c) => c.classList.remove("selected"));
      this.classList.add("selected");
      bookingData.professional = this.dataset.professional;
      enableNextButton(2);
    });
  });

  // Seleção de serviços
  document.querySelectorAll(".service-card").forEach((card) => {
    card.addEventListener("click", function () {
      document
        .querySelectorAll(".service-card")
        .forEach((c) => c.classList.remove("selected"));
      this.classList.add("selected");
      bookingData.service = this.dataset.service;
      bookingData.price = Number.parseInt(this.dataset.price);
      enableNextButton(3);
    });
  });
}

function generateTimeSlots() {
  const selectedDate = document.getElementById("appointmentDate").value;
  const timeSlotsContainer = document.getElementById("timeSlots");
  const selectedProfessional = bookingData.professional;

  if (!selectedDate || !selectedProfessional) {
    timeSlotsContainer.innerHTML = "<p style='color:#888'>Selecione o profissional e a data.</p>";
    return;
  }

  bookingData.date = selectedDate;
  timeSlotsContainer.innerHTML = "<span style='color:#888'>Carregando horários...</span>";

  // Buscar agendamentos do backend para o profissional e data
  fetch("https://barbearia-b8hw.onrender.com/api/agendamentos")
    .then((res) => res.json())
    .then((agendamentos) => {
      // Filtrar agendamentos do profissional, data e não cancelados
      const ocupados = agendamentos
        .filter(
          (a) =>
            a.profissional === selectedProfessional &&
            a.data === selectedDate &&
            a.status !== "cancelado"
        )
        .map((a) => a.horario);

      timeSlotsContainer.innerHTML = "";
      availableSlots.forEach((slot) => {
        const slotElement = document.createElement("div");
        slotElement.className = "time-slot";
        slotElement.textContent = slot;

        if (ocupados.includes(slot)) {
          slotElement.classList.add("unavailable");
        } else {
          slotElement.addEventListener("click", function () {
            document
              .querySelectorAll(".time-slot")
              .forEach((s) => s.classList.remove("selected"));
            this.classList.add("selected");
            bookingData.time = slot;
            enableNextButton(4);
          });
        }
        timeSlotsContainer.appendChild(slotElement);
      });
    });
}

function nextStep(step) {
  if (!validateStep(step)) return;

  if (step < 5) {
    currentStep++;
    showStep(currentStep);
    updateProgress();

    if (currentStep === 5) {
      updateSummary();
    }
  }
}

function prevStep(step) {
  if (step > 1) {
    currentStep--;
    showStep(currentStep);
    updateProgress();
  }
}

function showStep(step) {
  document
    .querySelectorAll(".step")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`step-${step}`).classList.add("active");

  // Atualizar indicadores
  document.querySelectorAll(".indicator").forEach((indicator, index) => {
    indicator.classList.remove("active", "completed");
    if (index + 1 === step) {
      indicator.classList.add("active");
    } else if (index + 1 < step) {
      indicator.classList.add("completed");
    }
  });
}

function validateStep(step) {
  switch (step) {
    case 1:
      const name = document.getElementById("clientName").value.trim();
      const phone = document.getElementById("clientPhone").value.trim();

      if (!name || !phone) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return false;
      }

      if (phone.length < 14) {
        alert("Por favor, insira um número de telefone válido.");
        return false;
      }

      bookingData.clientName = name;
      bookingData.clientPhone = phone;
      return true;

    case 2:
      if (!bookingData.professional) {
        alert("Por favor, selecione um profissional.");
        return false;
      }
      return true;

    case 3:
      if (!bookingData.service) {
        alert("Por favor, selecione um serviço.");
        return false;
      }
      return true;

    case 4:
      if (!bookingData.date || !bookingData.time) {
        alert("Por favor, selecione uma data e horário.");
        return false;
      }
      return true;

    default:
      return true;
  }
}

function enableNextButton(step) {
  const nextButton = document.querySelector(`#step-${step} .btn-next`);
  if (nextButton) {
    nextButton.disabled = false;
  }
}

function updateProgress() {
  const progress = document.getElementById("progress");
  const percentage = (currentStep / 5) * 100;
  progress.style.width = percentage + "%";
}

function updateSummary() {
  document.getElementById("summaryName").textContent = bookingData.clientName;
  document.getElementById("summaryProfessional").textContent =
    bookingData.professional;
  document.getElementById("summaryService").textContent = bookingData.service;
  document.getElementById("summaryDate").textContent = formatDate(
    bookingData.date
  );
  document.getElementById("summaryTime").textContent = bookingData.time;
  document.getElementById(
    "summaryPrice"
  ).textContent = `R$ ${bookingData.price},00`;
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  const days = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ];
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];

  return `${dayName}, ${day} de ${month}`;
}

function confirmarAgendamento() {
  // Use os dados já salvos em bookingData
  const booking = {
    nome: bookingData.clientName,
    telefone: bookingData.clientPhone,
    profissional: bookingData.professional,
    servico: bookingData.service,
    data: bookingData.date,
    horario: bookingData.time,
    preco: bookingData.price,
  };

  fetch("https://barbearia-b8hw.onrender.com/api/agendamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking),
  })
    .then((res) => res.json())
    .then((data) => {
      // Mensagem para o WhatsApp do cliente enviada pelo número da barbearia
      const numeroBarbearia = "5585999042698"; // DDI+DDD+número da barbearia
      let clienteTelefone = booking.telefone.replace(/\D/g, "");
      if (clienteTelefone.length === 11) {
        clienteTelefone = "55" + clienteTelefone;
      }
      if (clienteTelefone.length !== 13) {
        alert("Telefone do cliente inválido para envio de WhatsApp.");
        return;
      }
      const msg = `Seu agendamento foi confirmado!\n\nNome: ${booking.nome}\nServiço: ${booking.servico}\nProfissional: ${booking.profissional}\nData: ${formatDate(booking.data)}\nHorário: ${booking.horario}`;
      // Exibe feedback visual de sucesso
      showSuccessMessage();
      // Após um pequeno delay, abre o WhatsApp
      setTimeout(() => {
        const whatsappUrl = `https://wa.me/${clienteTelefone}?text=${encodeURIComponent(msg)}`;
        window.open(whatsappUrl, "_blank");
      }, 1200);
    })
    .catch(() => alert("Erro ao agendar!"));
}

function showSuccessMessage() {
  const msg = document.getElementById("successMessage");
  if (msg) msg.style.display = "flex";
}

function closeSuccessMessage() {
  const msg = document.getElementById("successMessage");
  if (msg) msg.style.display = "none";
  // Opcional: resetar formulário ou redirecionar para início
  // location.reload();
}

// Função para simular horários ocupados (em um app real, viria do backend)
function addOccupiedSlot(date, time) {
  if (!occupiedSlots[date]) {
    occupiedSlots[date] = [];
  }
  occupiedSlots[date].push(time);
}

// Exemplo de uso: addOccupiedSlot('2024-01-15', '10:30');

// Função para simular cancelamento (seria chamada quando cliente responde "CANCELAR AGENDAMENTO")
function simulateCancellation(appointmentData) {
  if (window.adminSystem) {
    window.adminSystem.addNotification(
      "Cancelamento",
      `${appointmentData.clientName} cancelou agendamento de ${appointmentData.service}`
    );
  }
}
