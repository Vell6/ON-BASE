const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeInMemoryStore,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const P = require('pino');
const chalk = require('chalk');
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const { getWeatherByLocation } = require('./services/weather');
const { formatRuntime, formatJidToPhone } = require('./utils/format');

const BOT_START_TIME = Date.now();
const COMMAND_PREFIX = '!';
const PAIRING_ACCESS_CODE = '12345678';

const logger = P({ level: 'silent' });
const store = makeInMemoryStore({ logger });

async function askQuestion(question) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

function isDisconnectCode(logoutError, expectedCode) {
  return logoutError?.output?.statusCode === expectedCode;
}

function buildMenu() {
  return [
    '🤖 *Menu WA Cuaca Bot*',
    '',
    `- ${COMMAND_PREFIX}cuaca <daerah>`,
    `  Contoh: ${COMMAND_PREFIX}cuaca kec-paloh`,
    `- ${COMMAND_PREFIX}runtime`,
    `- ${COMMAND_PREFIX}userinfo`,
    `- ${COMMAND_PREFIX}menu`
  ].join('\n');
}

function extractSenderName(message, sock) {
  const pushName = message.pushName?.trim();
  if (pushName) return pushName;

  const jid = message.key.participant || message.key.remoteJid;
  const contactName = store.contacts[jid]?.name || store.contacts[jid]?.notify;
  if (contactName) return contactName;

  return sock?.user?.name || 'User';
}

async function onCommand({ sock, message, body }) {
  const [rawCommand, ...args] = body.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
  const command = rawCommand?.toLowerCase();

  const remoteJid = message.key.remoteJid;
  const senderJid = message.key.participant || message.key.remoteJid;
  const senderName = extractSenderName(message, sock);

  if (!command) return;

  if (command === 'menu' || command === 'help') {
    await sock.sendMessage(remoteJid, { text: buildMenu() }, { quoted: message });
    return;
  }

  if (command === 'runtime') {
    const seconds = (Date.now() - BOT_START_TIME) / 1000;
    const text = `⏱️ Bot aktif selama: *${formatRuntime(seconds)}*`;
    await sock.sendMessage(remoteJid, { text }, { quoted: message });
    return;
  }

  if (command === 'userinfo') {
    const text = [
      '👤 *Informasi User*',
      `- Nama: ${senderName}`,
      `- Nomor: ${formatJidToPhone(senderJid)}`,
      `- JID: ${senderJid}`,
      `- Chat: ${remoteJid.endsWith('@g.us') ? 'Grup' : 'Personal'}`,
      `- Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
    ].join('\n');

    await sock.sendMessage(remoteJid, { text }, { quoted: message });
    return;
  }

  if (command === 'cuaca') {
    const location = args.join(' ').trim();

    if (!location) {
      await sock.sendMessage(
        remoteJid,
        { text: `Format salah. Contoh: *${COMMAND_PREFIX}cuaca kec-paloh*` },
        { quoted: message }
      );
      return;
    }

    try {
      const result = await getWeatherByLocation(location);

      if (!result.found) {
        await sock.sendMessage(remoteJid, { text: `⚠️ ${result.message}` }, { quoted: message });
        return;
      }

      const weatherText = [
        '🌤️ *Informasi Cuaca*',
        `- Lokasi: ${result.location.name}, ${result.location.admin1 || '-'}, ${result.location.country}`,
        `- Koordinat: ${result.location.latitude}, ${result.location.longitude}`,
        `- Waktu data: ${result.weather.time}`,
        `- Kondisi: ${result.weather.weatherText}`,
        `- Suhu: ${result.weather.temperature}°C`,
        `- Terasa seperti: ${result.weather.apparentTemperature}°C`,
        `- Kelembapan: ${result.weather.humidity}%`,
        `- Angin: ${result.weather.windSpeed} km/j`,
        `- Presipitasi: ${result.weather.precipitation} mm`,
        `- Hujan: ${result.weather.rain} mm`,
        `- Showers: ${result.weather.showers} mm`,
        `- Salju: ${result.weather.snowfall} cm`,
        '',
        `Diminta oleh: ${senderName} (${formatJidToPhone(senderJid)})`
      ].join('\n');

      await sock.sendMessage(remoteJid, { text: weatherText }, { quoted: message });
    } catch (error) {
      console.error(chalk.red('Gagal mengambil cuaca:'), error.message);
      await sock.sendMessage(
        remoteJid,
        { text: '❌ Terjadi kesalahan saat mengambil data cuaca. Coba lagi nanti.' },
        { quoted: message }
      );
    }

    return;
  }

  await sock.sendMessage(
    remoteJid,
    { text: `Perintah tidak dikenal. Ketik *${COMMAND_PREFIX}menu* untuk bantuan.` },
    { quoted: message }
  );
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger,
    printQRInTerminal: false,
    version,
    auth: state,
    browser: ['ON-BASE Weather Bot', 'Desktop', '1.0.0']
  });

  store.bind(sock.ev);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(chalk.green('✅ Bot tersambung ke WhatsApp.'));
      console.log(chalk.cyan(`📱 Login sebagai: ${sock.user?.name || '-'} (${sock.user?.id || '-'})`));
      return;
    }

    if (connection === 'close') {
      const logoutError = lastDisconnect?.error;
      const shouldReconnect = !isDisconnectCode(logoutError, DisconnectReason.loggedOut);

      console.log(chalk.yellow('⚠️ Koneksi terputus.'));

      if (shouldReconnect) {
        console.log(chalk.yellow('🔄 Mencoba konek ulang...'));
        await startBot();
      } else {
        console.log(chalk.red('❌ Sesi logout. Hapus folder auth_info lalu jalankan ulang bot.'));
      }
      return;
    }

    if (connection === 'connecting') {
      console.log(chalk.blue('🔌 Menghubungkan bot ke WhatsApp...'));
    }
  });

  if (!sock.authState.creds.registered) {
    const accessCode = await askQuestion('Masukkan kode akses pairing (default 12345678): ');

    if (accessCode !== PAIRING_ACCESS_CODE) {
      console.log(chalk.red('Kode pairing akses salah. Bot dihentikan.'));
      process.exit(1);
    }

    const phoneNumber = await askQuestion('Masukkan nomor WhatsApp (contoh 6281234567890): ');

    if (!/^\d{10,15}$/.test(phoneNumber)) {
      console.log(chalk.red('Format nomor tidak valid. Gunakan angka saja 10-15 digit.'));
      process.exit(1);
    }

    const pairingCode = await sock.requestPairingCode(phoneNumber);
    console.log(chalk.green(`🔐 Kode pairing WhatsApp kamu: ${pairingCode}`));
  }

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const message = messages[0];
    if (!message?.message || message.key.fromMe) return;

    const body =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      message.message.imageMessage?.caption ||
      '';

    if (!body.startsWith(COMMAND_PREFIX)) return;

    await onCommand({ sock, message, body });
  });
}

startBot().catch((error) => {
  console.error(chalk.red('Terjadi error fatal:'), error);
  process.exit(1);
});
