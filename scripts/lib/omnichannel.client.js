import axios from 'axios';

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getByPath(source, path) {
  if (!source || !path) {
    return undefined;
  }

  return String(path)
    .split('.')
    .filter(Boolean)
    .reduce((current, key) => current?.[key], source);
}

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function inferArrayFromPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const commonPaths = [
    'data',
    'items',
    'results',
    'rows',
    'records',
    'chats',
    'attendances',
    'atendimentos',
    'data.items',
    'data.results',
    'data.rows',
    'data.records',
    'data.chats',
    'data.attendances',
    'data.atendimentos'
  ];

  for (const path of commonPaths) {
    const candidate = getByPath(payload, path);
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIsoOrNull(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function pickMessageText(message) {
  return normalizeText(firstDefined(
    message?.text,
    message?.body,
    message?.content,
    message?.message,
    message?.mensagem,
    message?.texto,
    message?.payload?.text,
    message?.payload?.body
  ));
}

function pickMessageSender(message) {
  return normalizeText(firstDefined(
    message?.senderName,
    message?.sender,
    message?.author,
    message?.from,
    message?.role,
    message?.direction,
    message?.origem,
    message?.usuario,
    message?.user?.name,
    message?.customer?.name
  )) || 'desconhecido';
}

function pickMessageTimestamp(message) {
  return toIsoOrNull(firstDefined(
    message?.createdAt,
    message?.created_at,
    message?.timestamp,
    message?.date,
    message?.datetime,
    message?.dataHora,
    message?.sentAt
  ));
}

function normalizeMessage(message, index) {
  const text = pickMessageText(message);

  return {
    index,
    sender: pickMessageSender(message),
    text,
    createdAt: pickMessageTimestamp(message)
  };
}

function buildTranscript(messages) {
  return messages
    .filter(message => message.text)
    .sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return a.index - b.index;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return a.createdAt.localeCompare(b.createdAt) || a.index - b.index;
    })
    .map(message => `${message.sender}: ${message.text}`)
    .join('\n');
}

function normalizeAttendanceId(attendance) {
  return String(firstDefined(
    attendance?.id,
    attendance?.attendanceId,
    attendance?.atendimentoId,
    attendance?.chatId,
    attendance?.conversationId,
    attendance?.ticketId,
    attendance?.protocolo
  ) ?? '');
}

function normalizeCustomerName(attendance) {
  return normalizeText(firstDefined(
    attendance?.customerName,
    attendance?.cliente?.nome,
    attendance?.customer?.name,
    attendance?.contact?.name,
    attendance?.name
  )) || null;
}

function normalizeChannel(attendance) {
  return normalizeText(firstDefined(
    attendance?.channel,
    attendance?.canal,
    attendance?.source,
    attendance?.origem
  )) || null;
}

function pickEmbeddedMessages(attendance) {
  const commonPaths = [
    'messages',
    'mensagens',
    'chat.messages',
    'conversation.messages',
    'history.messages',
    'historico.mensagens',
    'data.messages',
    'data.mensagens'
  ];

  for (const path of commonPaths) {
    const candidate = getByPath(attendance, path);
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export class OmnichannelClient {
  constructor(config = {}) {
    this.attendancesUrl = config.attendancesUrl;
    this.messagesUrlTemplate = config.messagesUrlTemplate || null;
    this.itemsPath = config.itemsPath || null;
    this.messagesItemsPath = config.messagesItemsPath || null;
    this.pageParam = config.pageParam || null;
    this.pageSizeParam = config.pageSizeParam || null;
    this.pageSize = numberFromEnv(config.pageSize, 50);
    this.maxPages = numberFromEnv(config.maxPages, 1);
    this.timeout = numberFromEnv(config.timeout, 30000);
    this.authHeader = config.authHeader || 'Authorization';
    this.authScheme = config.authScheme || 'Bearer';
    this.token = config.token || null;

    this.api = axios.create({
      timeout: this.timeout,
      headers: this.buildHeaders()
    });
  }

  buildHeaders() {
    if (!this.token) {
      return {};
    }

    const headerValue = this.authScheme
      ? `${this.authScheme} ${this.token}`.trim()
      : this.token;

    return {
      [this.authHeader]: headerValue
    };
  }

  extractItems(payload, customPath = null) {
    if (customPath) {
      const candidate = getByPath(payload, customPath);
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return inferArrayFromPayload(payload);
  }

  async fetchAttendances() {
    if (!this.attendancesUrl) {
      throw new Error('OMNICHANNEL_ATTENDANCES_URL nao configurada');
    }

    if (!this.pageParam) {
      const response = await this.api.get(this.attendancesUrl);
      return this.extractItems(response.data, this.itemsPath);
    }

    const results = [];

    for (let page = 1; page <= this.maxPages; page += 1) {
      const params = { [this.pageParam]: page };

      if (this.pageSizeParam) {
        params[this.pageSizeParam] = this.pageSize;
      }

      const response = await this.api.get(this.attendancesUrl, { params });
      const items = this.extractItems(response.data, this.itemsPath);

      if (items.length === 0) {
        break;
      }

      results.push(...items);

      if (items.length < this.pageSize) {
        break;
      }
    }

    return results;
  }

  async fetchMessages(attendanceId) {
    if (!this.messagesUrlTemplate) {
      return [];
    }

    const url = this.messagesUrlTemplate.replace('{id}', encodeURIComponent(attendanceId));
    const response = await this.api.get(url);
    return this.extractItems(response.data, this.messagesItemsPath);
  }

  async normalizeAttendance(attendance) {
    const attendanceId = normalizeAttendanceId(attendance);
    const embeddedMessages = pickEmbeddedMessages(attendance);
    const rawMessages = embeddedMessages.length > 0
      ? embeddedMessages
      : (attendanceId ? await this.fetchMessages(attendanceId) : []);
    const messages = rawMessages
      .map((message, index) => normalizeMessage(message, index))
      .filter(message => message.text);

    return {
      attendanceId,
      createdAt: toIsoOrNull(firstDefined(
        attendance?.createdAt,
        attendance?.created_at,
        attendance?.openedAt,
        attendance?.dataCriacao
      )),
      customerName: normalizeCustomerName(attendance),
      channel: normalizeChannel(attendance),
      messageCount: messages.length,
      messages,
      transcript: buildTranscript(messages),
      raw: attendance
    };
  }

  async fetchAndNormalizeAttendances() {
    const attendances = await this.fetchAttendances();
    const normalized = [];

    for (const attendance of attendances) {
      normalized.push(await this.normalizeAttendance(attendance));
    }

    return normalized;
  }
}
