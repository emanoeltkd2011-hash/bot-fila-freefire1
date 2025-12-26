
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

/* ================= CONFIGURAÇÕES ================= */

// 🔑 Cargo do ADM
const ADM_ROLE_NAME = "Adm";

// 💰 Valores (você pode editar depois)
const VALOR_ENTRADA = 0.25; // aparece no botão
const TAXA = 0.20;         // aparece no ticket

// 📂 Categoria onde serão criados os tickets
const TICKET_CATEGORY_NAME = "tickets";

// 🕒 Armazena filas
const filas = {
  normal: [],
  infinito: []
};

/* ================= BOT ONLINE ================= */

client.once("ready", () => {
  console.log(`🤖 Bot ligado como ${client.user.tag}`);
});

/* ================= INTERAÇÃO ================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, user, guild } = interaction;

  /* ===== ENTRAR NA FILA ===== */
  if (customId === "fila_normal" || customId === "fila_infinito") {
    const tipo = customId === "fila_normal" ? "normal" : "infinito";

    // evita entrar duas vezes
    if (filas[tipo].includes(user.id)) {
      return interaction.reply({
        content: "❌ Você já está nessa fila.",
        ephemeral: true
      });
    }

    filas[tipo].push(user.id);

    // espera dois jogadores
    if (filas[tipo].length < 2) {
      return interaction.reply({
        content: `⏳ Você entrou na fila **Gel ${tipo}**. Aguardando adversário...`,
        ephemeral: true
      });
    }

    // pega os dois
    const jogador1 = filas[tipo].shift();
    const jogador2 = filas[tipo].shift();

    /* ===== CANAL DE CONFIRMAÇÃO ===== */
    const confirmChannel = await guild.channels.create({
      name: `confirma-${tipo}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: jogador1,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        },
        {
          id: jogador2,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    const rowConfirm = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirmar_partida")
        .setLabel("✅ Confirmar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancelar_partida")
        .setLabel("❌ Cancelar")
        .setStyle(ButtonStyle.Danger)
    );

    await confirmChannel.send({
      content: `🎮 <@${jogador1}> vs <@${jogador2}>\n**Gel ${tipo}**\n\nConfirme para continuar.`,
      components: [rowConfirm]
    });

    return interaction.reply({
      content: "🎯 Partida encontrada!",
      ephemeral: true
    });
  }

  /* ===== CANCELAR ===== */
  if (customId === "cancelar_partida") {
    await interaction.channel.send("❌ Partida cancelada.");
    return interaction.channel.delete();
  }

  /* ===== CONFIRMAR ===== */
  if (customId === "confirmar_partida") {
    const channel = interaction.channel;

    /* ===== CRIAR TICKET ===== */
    const admRole = guild.roles.cache.find(r => r.name === ADM_ROLE_NAME);

    const ticketCategory =
      guild.channels.cache.find(c => c.name === TICKET_CATEGORY_NAME && c.type === ChannelType.GuildCategory) ||
      await guild.channels.create({
        name: TICKET_CATEGORY_NAME,
        type: ChannelType.GuildCategory
      });

    const ticket = await guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: ticketCategory.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        },
        {
          id: admRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    await ticket.send(
      `💰 **Pagamento da Partida**\n\n` +
      `Valor da entrada: **R$${VALOR_ENTRADA.toFixed(2)}**\n` +
      `Taxa: **R$${TAXA.toFixed(2)}**\n\n` +
      `📸 Envie o comprovante do PIX aqui.\n\n` +
      `⛔ Não há cancelamento nesta etapa.`
    );

    return interaction.reply({
      content: "✅ Confirmação feita! Ticket criado.",
      ephemeral: true
    });
  }
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
