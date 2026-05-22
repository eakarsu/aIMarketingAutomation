import { Router } from 'express';

const router = Router();

router.post('/score', (req, res) => {
  const contacts = Array.isArray(req.body?.contacts)
    ? req.body.contacts
    : [
        { email: 'sam@example.com', sends7d: 9, opens7d: 1, unsubscribed: false },
        { email: 'lee@example.com', sends7d: 3, opens7d: 2, unsubscribed: false },
      ];
  const scored = contacts.map((contact: any) => {
    const sends = Number(contact.sends7d || 0);
    const opens = Number(contact.opens7d || 0);
    const fatigue = Math.min(100, Math.max(0, sends * 11 - opens * 9 + (contact.unsubscribed ? 100 : 0)));
    return {
      email: contact.email,
      fatigue,
      action: fatigue >= 70 ? 'suppress for 14 days' : fatigue >= 45 ? 'reduce cadence' : 'normal cadence',
      reason: `${sends} sends and ${opens} opens in 7 days`,
    };
  });
  res.json({ scored, suppressions: scored.filter((row: any) => row.fatigue >= 70).length });
});

export default router;
