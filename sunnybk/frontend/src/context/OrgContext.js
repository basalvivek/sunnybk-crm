import React, { createContext, useContext, useState, useEffect } from 'react';
import { getOrgSettings } from '../api';

const DEFAULT = {
  org_name: 'Sunny BK',
  tagline: 'CRM System',
  logo_data: null,
  currency: 'GBP',
  currency_symbol: '£',
  address: null,
  phone: null,
  email: null,
  website: null,
};

const OrgContext = createContext({ org: DEFAULT, setOrg: () => {} });

export function OrgProvider({ children }) {
  const [org, setOrg] = useState(DEFAULT);

  useEffect(() => {
    getOrgSettings()
      .then(r => { if (r.data?.data) setOrg(r.data.data); })
      .catch(() => {});
  }, []);

  return <OrgContext.Provider value={{ org, setOrg }}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  return useContext(OrgContext);
}
