import api from './axios';

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  updateProfile: (data) => api.patch('/auth/me', data),

  // Password management
  changePassword: (data) => api.post('/auth/change-password', data),
  requestPasswordReset: (data) => api.post('/auth/forgot-password/request', data),
};

// Estates
export const estateAPI = {
  create: (data) => api.post('/estates', data),
  getAll: () => api.get('/estates'),
  getOne: (id) => api.get(`/estates/${id}`),
  update: (id, data) => api.patch(`/estates/${id}`, data),
  getStats: () => api.get('/estates/stats'),
  getConstitutionMeta: (id) => api.get(`/estates/${id}/constitution/meta`),
  constitutionFileUrl: (id) => `/estates/${id}/constitution/file`,
};

// Visitors
export const visitorAPI = {
  getAll: (params) => api.get('/visitors', { params }),
  getOne: (id) => api.get(`/visitors/${id}`),
  preRegister: (data) => api.post('/visitors', data),
  verify: (code) => api.get(`/visitors/verify/${code}`),
  checkIn: (id) => api.patch(`/visitors/${id}/checkin`),
  checkOut: (id) => api.patch(`/visitors/${id}/checkout`),
  blacklist: (id) => api.patch(`/visitors/${id}/blacklist`),
  approveEarly: (id) => api.post(`/visitors/${id}/approve-early`),
  cancel: (id) => api.patch(`/visitors/${id}/cancel`),
};

// Residents
export const residentAPI = {
  getAll: (params) => api.get('/residents', { params }),
  invite: (data) => api.post('/residents/invite', data),
  add: (data) => api.post('/residents', data),
  suspend: (id) => api.patch(`/residents/${id}/suspend`),
  activate: (id) => api.patch(`/residents/${id}/activate`),
  assignUnit: (id, unitId) => api.patch(`/residents/${id}/assign-unit`, { unitId }),
};

// Units
export const unitAPI = {
  getAll: (params) => api.get('/units', { params }),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.patch(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
};

// Announcements
export const announcementAPI = {
  getAll: (params) => api.get('/announcements', { params }),
  create: (formData) => api.post('/announcements', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.patch(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  markRead: (id) => api.post(`/announcements/${id}/read`),
};

// Marketplace
export const marketplaceAPI = {
  getAll: (params) => api.get('/marketplace', { params }),
  getOne: (id) => api.get(`/marketplace/${id}`),
  create: (formData) => api.post('/marketplace', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.patch(`/marketplace/${id}`, data),
  delete: (id) => api.delete(`/marketplace/${id}`),
  mine: () => api.get('/marketplace/mine'),
  saved: () => api.get('/marketplace/saved'),
  rules: () => api.get('/marketplace/rules'),
  toggleSave: (id) => api.post(`/marketplace/${id}/save`),
  report: (id, reason, note) => api.post(`/marketplace/${id}/report`, { reason, note }),
  review: (id, rating, comment) => api.post(`/marketplace/${id}/review`, { rating, comment }),
  // Buying (Paystack → escrow) and the seller wallet
  buy: (id, quantity, note) => api.post(`/marketplace/${id}/buy`, { quantity, note }),
  verifyOrder: (reference) => api.get(`/marketplace/orders/verify/${reference}`),
  orders: (as) => api.get('/marketplace/orders', { params: { as } }),
  deliver: (id) => api.post(`/marketplace/orders/${id}/deliver`),
  confirm: (id) => api.post(`/marketplace/orders/${id}/confirm`),
  cancelOrder: (id, reason) => api.post(`/marketplace/orders/${id}/cancel`, { reason }),
  dispute: (id, reason, note) => api.post(`/marketplace/orders/${id}/dispute`, { reason, note }),
  wallet: () => api.get('/marketplace/wallet'),
  withdraw: (amount) => api.post('/marketplace/wallet/withdraw', { amount }),
};

// Messages
export const messageAPI = {
  getGroup: (params) => api.get('/messages/group', { params }),
  getDM: (userId) => api.get(`/messages/dm/${userId}`),
  getConversations: () => api.get('/messages/conversations'),
  getUnread: () => api.get('/messages/unread'),
  getEstateUsers: (params) => api.get('/messages/users', { params }),
  send: (data) => api.post('/messages', data),
};

// Alerts
export const alertAPI = {
  getAll: (params) => api.get('/alerts', { params }),
  create: (data) => api.post('/alerts', data),
  acknowledge: (id) => api.patch(`/alerts/${id}/acknowledge`),
  resolve: (id) => api.patch(`/alerts/${id}/resolve`),
  broadcast: (data) => api.post('/alerts/broadcast', data),
};

// Events
export const eventAPI = {
  getAll: () => api.get('/events'),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  rsvp: (id) => api.patch(`/events/${id}/rsvp`),
};

// Polls
export const pollAPI = {
  getAll: () => api.get('/polls'),
  create: (data) => api.post('/polls', data),
  vote: (id, optionIndex) => api.post(`/polls/${id}/vote`, { optionIndex }),
  close: (id) => api.patch(`/polls/${id}/close`),
};

// Lounge
export const loungeAPI = {
  getSession: () => api.get('/lounge'),
  updateMood: (data) => api.patch('/lounge/mood', data),
  suggest: (videoId, title) => api.post('/lounge/suggest', { videoId, title }),
  vote: (suggestionId) => api.post(`/lounge/suggest/${suggestionId}/vote`),
  remove: (suggestionId) => api.delete(`/lounge/suggest/${suggestionId}`),
};

// Live DJ sessions + mixtapes (per-estate). Any resident can host.
export const djAPI = {
  getActive:     () => api.get('/dj/active'),
  start:         (data) => api.post('/dj/start', data),
  updateTrack:   (id, data) => api.patch(`/dj/${id}/track`, data),
  end:           (id) => api.post(`/dj/${id}/end`),
  listMixtapes:  () => api.get('/dj/mixtapes'),
  saveMixtape:   (data) => api.post('/dj/mixtapes', data),
  deleteMixtape: (id) => api.delete(`/dj/mixtapes/${id}`),
  recordPlay:    (id) => api.post(`/dj/mixtapes/${id}/play`),
};

// Admin podcast — listener side (any authenticated user)
export const podcastAPI = {
  getLive:       () => api.get('/podcast/live'),
  getUpcoming:   () => api.get('/podcast/upcoming'),
  listEpisodes:  () => api.get('/podcast/episodes'),
  recordPlay:    (id) => api.post(`/podcast/episodes/${id}/play`),
};

// Payments
export const paymentAPI = {
  getMine: () => api.get('/payments/mine'),
  initialize: (paymentId) => api.post(`/payments/${paymentId}/initialize`),
  verify: (reference) => api.get(`/payments/verify/${reference}`),
  getInvoice: (paymentId) => api.get(`/payments/${paymentId}/invoice`),
};

// Social posts (Lounge feed)
export const postAPI = {
  getAll:        (page = 1) => api.get(`/posts?page=${page}&limit=20`),
  stories:       () => api.get('/posts/stories'),
  create:        (formData) => api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:        (id) => api.delete(`/posts/${id}`),
  like:          (id) => api.post(`/posts/${id}/like`),
  addComment:    (id, text) => api.post(`/posts/${id}/comments`, { text }),
  deleteComment: (id, commentId) => api.delete(`/posts/${id}/comments/${commentId}`),
};

// Courtroom
export const courtAPI = {
  listCases:         (params) => api.get('/court', { params }),
  getCase:           (id) => api.get(`/court/${id}`),
  getStats:          () => api.get('/court/stats'),
  getMembers:        () => api.get('/court/members'),
  fileCase:          (data) => api.post('/court', data),
  hireLawyer:        (id, data) => api.post(`/court/${id}/lawyer`, data),
  submitArgument:    (id, data) => api.post(`/court/${id}/argument`, data),
  submitEvidence:    (id, data) => api.post(`/court/${id}/evidence`, data),
  castJuryVote:      (id, data) => api.post(`/court/${id}/jury-vote`, data),
  proposeSettlement: (id, data) => api.post(`/court/${id}/settle`, data),
  fileAppeal:        (id, data) => api.post(`/court/${id}/appeal`, data),
  payFine:           (id) => api.post(`/court/${id}/pay-fine`),
  chatWithLawyer:    (id, message) => api.post(`/court/${id}/chat`, { message }),
  requestAdjournment:(id, reason) => api.post(`/court/${id}/adjourn`, { reason }),
  attach:            (id, formData) => api.post(`/court/${id}/attach`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const campaignAPI = {
  getActive: (placement) => api.get('/campaigns/active', { params: { placement } }),
  markSeen:  (id) => api.post(`/campaigns/${id}/seen`),
  dismiss:   (id) => api.post(`/campaigns/${id}/dismiss`),
  click:     (id) => api.post(`/campaigns/${id}/click`),
};

// Calls, call credits and neighbour buzz
export const callAPI = {
  ringing:     () => api.get('/calls/ringing'),
  config:      () => api.get('/calls/config'),
  directory:   () => api.get('/calls/directory'),
  history:     () => api.get('/calls/history'),
  start:       (calleeId) => api.post('/calls', { calleeId }),
  answer:      (id) => api.post(`/calls/${id}/answer`),
  decline:     (id) => api.post(`/calls/${id}/decline`),
  cancel:      (id) => api.post(`/calls/${id}/cancel`),
  end:         (id) => api.post(`/calls/${id}/end`),
  credits:     () => api.get('/calls/credits'),
  topup:       (packId) => api.post('/calls/credits/topup', { packId }),
  verifyTopup: (reference) => api.get(`/calls/credits/verify/${encodeURIComponent(reference)}`),
  buzz:        (toUserId, kind, message) => api.post('/calls/buzz', { toUserId, kind, message }),
  buzzes:      () => api.get('/calls/buzz'),
  receipt:     (txId) => api.get(`/calls/credits/receipt/${txId}`, { responseType: 'blob' }),
};

// Personal safety: blocks, "I'm being followed", live location
export const safetyAPI = {
  searchResidents: (q) => api.get('/safety/residents', { params: { q } }),
  blocks:          () => api.get('/safety/blocks'),
  block:           (userId, reason, gateWatch = true) => api.post('/safety/blocks', { userId, reason, gateWatch }),
  setGateWatch:    (id, gateWatch) => api.patch(`/safety/blocks/${id}`, { gateWatch }),
  unblock:         (id) => api.delete(`/safety/blocks/${id}`),
  followed:        (payload) => api.post('/safety/followed', payload),
  startLocation:   () => api.post('/safety/location/start'),
  stopLocation:    () => api.post('/safety/location/stop'),
};
