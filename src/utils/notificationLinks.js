// Where each notification takes you. Returns either a route (with the item to
// open/highlight in its query string) or an action the bell handles itself.
//   ?focus=<id>  → the page scrolls to that item and flashes it (see useFocusItem)
export function linkFor(n) {
  const m = n?.meta || {};
  if (m.url) return { to: m.url };
  switch (n?.type) {
    case 'visitor_checkin':
    case 'visitor_checkout':   return { to: m.visitorId ? `/visitors/${m.visitorId}` : '/visitors' };
    case 'new_alert':
    case 'alert_broadcast':    return { action: 'alert' };
    case 'live_dj':
    case 'live_announcement':
    case 'live_podcast':       return { action: 'live' };
    case 'new_announcement':   return { to: m.announcementId ? `/announcements?focus=${m.announcementId}` : '/announcements' };
    case 'payment_received':
    case 'payment_due':
    case 'payment_overdue':    return { to: m.paymentId ? `/payments?payment=${m.paymentId}` : '/payments' };
    case 'new_post':           return { to: m.postId ? `/lounge?focus=${m.postId}` : '/lounge' };
    case 'post_like':          return { to: `/lounge?focus=${m.postId}` };
    case 'post_comment':       return { to: `/lounge?focus=${m.postId}&comments=1` };
    case 'new_event':          return { to: m.eventId ? `/events?focus=${m.eventId}` : '/events' };
    case 'new_poll':           return { to: m.pollId ? `/polls?focus=${m.pollId}` : '/polls' };
    case 'marketplace':
    case 'marketplace_item':   return { to: m.listingId ? `/marketplace?listing=${m.listingId}` : '/marketplace' };
    case 'marketplace_order':  return { to: m.orderId ? `/marketplace?orderId=${m.orderId}` : '/marketplace' };
    case 'court_update':
    case 'jury_summoned':      return { to: m.caseId ? `/courtroom?case=${m.caseId}` : '/courtroom' };
    case 'household_update':   return { to: '/household' };
    case 'new_resident':       return { to: m.residentId ? `/neighbours?focus=${m.residentId}` : '/neighbours' };
    case 'neighbour_buzz':     return { to: m.from?.role === 'resident' && m.from?._id ? `/neighbours?buzzback=${m.from._id}` : '/neighbours' };
    case 'missed_call':
    case 'credits_added':      return { to: '/neighbours' };
    case 'new_message':        return { to: m.fromId ? `/chat?dm=${m.fromId}` : '/chat' };
    default:                   return { to: null };
  }
}
