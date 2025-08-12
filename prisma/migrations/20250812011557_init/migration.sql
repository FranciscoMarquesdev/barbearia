-- CreateTable
CREATE TABLE `Agendamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `profissional` VARCHAR(191) NOT NULL,
    `servico` VARCHAR(191) NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `horario` VARCHAR(191) NOT NULL,
    `preco` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'confirmado',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
