import type { SecurityType } from '../types/streamSet';

export interface SecurityCatalogItem {
  id: string;
  name: string;
  alias: string;
  isin: string;
  type: SecurityType;
  maturity: string;
  couponRate: number;
}

export const SECURITY_CATALOG: SecurityCatalogItem[] = [
  // ── M Bono (25 securities) ──────────────────────────────────────────────────
  { id: 'cat-mbono-mar26', name: 'M Bono 5.750% Mar-2026', alias: 'MAR26', isin: 'MX0MGO0000H9', type: 'M Bono', maturity: '2026-03-05', couponRate: 5.75 },
  { id: 'cat-mbono-sep26', name: 'M Bono 7.750% Sep-2026', alias: 'SEP26', isin: 'MX0MGO0000J5', type: 'M Bono', maturity: '2026-09-03', couponRate: 7.75 },
  { id: 'cat-mbono-dec26', name: 'M Bono 8.000% Dec-2026', alias: 'DEC26', isin: 'MX0MGO000103', type: 'M Bono', maturity: '2026-12-03', couponRate: 8.0 },
  { id: 'cat-mbono-mar27', name: 'M Bono 7.500% Mar-2027', alias: 'MAR27', isin: 'MX0MGO0000K3', type: 'M Bono', maturity: '2027-03-04', couponRate: 7.5 },
  { id: 'cat-mbono-jun27', name: 'M Bono 7.250% Jun-2027', alias: 'JUN27', isin: 'MX0MGO0000L1', type: 'M Bono', maturity: '2027-06-03', couponRate: 7.25 },
  { id: 'cat-mbono-mar28', name: 'M Bono 8.500% Mar-2028', alias: 'MAR28', isin: 'MX0MGO0000M9', type: 'M Bono', maturity: '2028-03-02', couponRate: 8.5 },
  { id: 'cat-mbono-jun28', name: 'M Bono 9.000% Jun-2028', alias: 'JUN28', isin: 'MX0MGO000104', type: 'M Bono', maturity: '2028-06-07', couponRate: 9.0 },
  { id: 'cat-mbono-mar29', name: 'M Bono 8.500% Mar-2029', alias: 'MAR29', isin: 'MX0MGO0000N7', type: 'M Bono', maturity: '2029-03-01', couponRate: 8.5 },
  { id: 'cat-mbono-may29', name: 'M Bono 8.500% May-2029', alias: 'MAY29', isin: 'MX0MGO0000O5', type: 'M Bono', maturity: '2029-05-31', couponRate: 8.5 },
  { id: 'cat-mbono-feb30', name: 'M Bono 8.500% Feb-2030', alias: 'FEB30', isin: 'MX0MGO0000P2', type: 'M Bono', maturity: '2030-02-28', couponRate: 8.5 },
  { id: 'cat-mbono-sep30', name: 'M Bono 8.750% Sep-2030', alias: 'SEP30', isin: 'MX0MGO000105', type: 'M Bono', maturity: '2030-09-05', couponRate: 8.75 },
  { id: 'cat-mbono-may31', name: 'M Bono 7.750% May-2031', alias: 'MAY31', isin: 'MX0MGO0000Q0', type: 'M Bono', maturity: '2031-05-29', couponRate: 7.75 },
  { id: 'cat-mbono-mar32', name: 'M Bono 9.500% Mar-2032', alias: 'MAR32', isin: 'MX0MGO000106', type: 'M Bono', maturity: '2032-03-04', couponRate: 9.5 },
  { id: 'cat-mbono-apr32', name: 'M Bono 7.500% Apr-2032', alias: 'APR32', isin: 'MX0MGO0000R8', type: 'M Bono', maturity: '2032-04-29', couponRate: 7.5 },
  { id: 'cat-mbono-may33', name: 'M Bono 8.000% May-2033', alias: 'MAY33', isin: 'MX0MGO0000S6', type: 'M Bono', maturity: '2033-05-26', couponRate: 8.0 },
  { id: 'cat-mbono-nov34', name: 'M Bono 7.750% Nov-2034', alias: 'NOV34', isin: 'MX0MGO0000T4', type: 'M Bono', maturity: '2034-11-23', couponRate: 7.75 },
  { id: 'cat-mbono-may35', name: 'M Bono 7.750% May-2035', alias: 'MAY35', isin: 'MX0MGO0000U2', type: 'M Bono', maturity: '2035-05-24', couponRate: 7.75 },
  { id: 'cat-mbono-feb36', name: 'M Bono 10.000% Feb-2036', alias: 'FEB36', isin: 'MX0MGO0000V0', type: 'M Bono', maturity: '2036-02-21', couponRate: 10.0 },
  { id: 'cat-mbono-nov36', name: 'M Bono 10.000% Nov-2036', alias: 'NOV36', isin: 'MX0MGO0000W8', type: 'M Bono', maturity: '2036-11-20', couponRate: 10.0 },
  { id: 'cat-mbono-dec37', name: 'M Bono 9.000% Dec-2037', alias: 'DEC37', isin: 'MX0MGO000107', type: 'M Bono', maturity: '2037-12-09', couponRate: 9.0 },
  { id: 'cat-mbono-nov38', name: 'M Bono 8.500% Nov-2038', alias: 'NOV38', isin: 'MX0MGO0000X6', type: 'M Bono', maturity: '2038-11-18', couponRate: 8.5 },
  { id: 'cat-mbono-nov42', name: 'M Bono 8.000% Nov-2042', alias: 'NOV42', isin: 'MX0MGO0000Y4', type: 'M Bono', maturity: '2042-11-19', couponRate: 8.0 },
  { id: 'cat-mbono-nov47', name: 'M Bono 7.750% Nov-2047', alias: 'NOV47', isin: 'MX0MGO0000Z1', type: 'M Bono', maturity: '2047-11-13', couponRate: 7.75 },
  { id: 'cat-mbono-jul53', name: 'M Bono 8.000% Jul-2053', alias: 'JUL53', isin: 'MX0MGO000101', type: 'M Bono', maturity: '2053-07-08', couponRate: 8.0 },
  { id: 'cat-mbono-apr55', name: 'M Bono 5.500% Apr-2055', alias: 'APR55', isin: 'MX0MGO000102', type: 'M Bono', maturity: '2055-04-03', couponRate: 5.5 },

  // ── UDI Bono (13 securities) ────────────────────────────────────────────────
  { id: 'cat-udi-nov28', name: 'UDI Bono 4.00% Nov-2028', alias: 'NOV28', isin: 'MX0UDI000001', type: 'UDI Bono', maturity: '2028-11-09', couponRate: 4.0 },
  { id: 'cat-udi-may29', name: 'UDI Bono 4.25% May-2029', alias: 'MAY29U', isin: 'MX0UDI000010', type: 'UDI Bono', maturity: '2029-05-09', couponRate: 4.25 },
  { id: 'cat-udi-nov31', name: 'UDI Bono 4.50% Nov-2031', alias: 'NOV31', isin: 'MX0UDI000002', type: 'UDI Bono', maturity: '2031-11-06', couponRate: 4.5 },
  { id: 'cat-udi-jun33', name: 'UDI Bono 3.75% Jun-2033', alias: 'JUN33', isin: 'MX0UDI000011', type: 'UDI Bono', maturity: '2033-06-05', couponRate: 3.75 },
  { id: 'cat-udi-ago34', name: 'UDI Bono 4.00% Aug-2034', alias: 'AGO34', isin: 'MX0UDI000003', type: 'UDI Bono', maturity: '2034-08-03', couponRate: 4.0 },
  { id: 'cat-udi-nov35', name: 'UDI Bono 4.00% Nov-2035', alias: 'NOV35', isin: 'MX0UDI000004', type: 'UDI Bono', maturity: '2035-11-01', couponRate: 4.0 },
  { id: 'cat-udi-ago37', name: 'UDI Bono 4.50% Aug-2037', alias: 'AGO37', isin: 'MX0UDI000012', type: 'UDI Bono', maturity: '2037-08-02', couponRate: 4.5 },
  { id: 'cat-udi-nov40', name: 'UDI Bono 4.00% Nov-2040', alias: 'NOV40', isin: 'MX0UDI000005', type: 'UDI Bono', maturity: '2040-10-31', couponRate: 4.0 },
  { id: 'cat-udi-nov43', name: 'UDI Bono 4.00% Nov-2043', alias: 'NOV43', isin: 'MX0UDI000006', type: 'UDI Bono', maturity: '2043-10-28', couponRate: 4.0 },
  { id: 'cat-udi-nov46', name: 'UDI Bono 4.00% Nov-2046', alias: 'NOV46', isin: 'MX0UDI000007', type: 'UDI Bono', maturity: '2046-10-22', couponRate: 4.0 },
  { id: 'cat-udi-nov50', name: 'UDI Bono 4.00% Nov-2050', alias: 'NOV50', isin: 'MX0UDI000008', type: 'UDI Bono', maturity: '2050-10-15', couponRate: 4.0 },
  { id: 'cat-udi-oct54', name: 'UDI Bono 3.25% Oct-2054', alias: 'OCT54', isin: 'MX0UDI000009', type: 'UDI Bono', maturity: '2054-10-08', couponRate: 3.25 },
  { id: 'cat-udi-dic48', name: 'UDI Bono 3.50% Dec-2048', alias: 'DIC48', isin: 'MX0UDI000013', type: 'UDI Bono', maturity: '2048-12-10', couponRate: 3.5 },

  // ── Cetes (10 securities) ───────────────────────────────────────────────────
  { id: 'cat-cetes-feb26', name: 'CETES 28-Feb-2026', alias: 'CETES 28', isin: 'MX0CET000001', type: 'Cetes', maturity: '2026-02-28', couponRate: 0 },
  { id: 'cat-cetes-may26', name: 'CETES 28-May-2026', alias: 'CETES 55', isin: 'MX0CET000002', type: 'Cetes', maturity: '2026-05-28', couponRate: 0 },
  { id: 'cat-cetes-aug26', name: 'CETES 28-Aug-2026', alias: 'CETES 89', isin: 'MX0CET000003', type: 'Cetes', maturity: '2026-08-28', couponRate: 0 },
  { id: 'cat-cetes-nov26', name: 'CETES 28-Nov-2026', alias: 'CETES 180', isin: 'MX0CET000004', type: 'Cetes', maturity: '2026-11-28', couponRate: 0 },
  { id: 'cat-cetes-feb27', name: 'CETES 28-Feb-2027', alias: 'CETES 28D', isin: 'MX0CET000005', type: 'Cetes', maturity: '2027-02-25', couponRate: 0 },
  { id: 'cat-cetes-may27', name: 'CETES 28-May-2027', alias: 'CETES 35D', isin: 'MX0CET000006', type: 'Cetes', maturity: '2027-05-27', couponRate: 0 },
  { id: 'cat-cetes-aug27', name: 'CETES 28-Aug-2027', alias: 'CETES 91D', isin: 'MX0CET000007', type: 'Cetes', maturity: '2027-08-26', couponRate: 0 },
  { id: 'cat-cetes-nov27', name: 'CETES 28-Nov-2027', alias: 'CETES 182D', isin: 'MX0CET000008', type: 'Cetes', maturity: '2027-11-25', couponRate: 0 },
  { id: 'cat-cetes-feb28', name: 'CETES 28-Feb-2028', alias: 'CETES 364D', isin: 'MX0CET000009', type: 'Cetes', maturity: '2028-02-24', couponRate: 0 },
  { id: 'cat-cetes-may28', name: 'CETES 28-May-2028', alias: 'CETES 28E', isin: 'MX0CET000010', type: 'Cetes', maturity: '2028-05-25', couponRate: 0 },

  // ── Corporate MXN (10 securities) ──────────────────────────────────────────
  { id: 'cat-corp-pemex26', name: 'PEMEX 6.875% 2026', alias: 'PEMEX26', isin: 'MX0COR000001', type: 'Corporate MXN', maturity: '2026-08-04', couponRate: 6.875 },
  { id: 'cat-corp-banorte26', name: 'BANORTE 6.000% 2026', alias: 'BNORTE26', isin: 'MX0COR000005', type: 'Corporate MXN', maturity: '2026-10-15', couponRate: 6.0 },
  { id: 'cat-corp-cfe27', name: 'CFE 5.250% 2027', alias: 'CFE27', isin: 'MX0COR000002', type: 'Corporate MXN', maturity: '2027-12-15', couponRate: 5.25 },
  { id: 'cat-corp-bimbo27', name: 'BIMBO 5.500% 2027', alias: 'BIMBO27', isin: 'MX0COR000004', type: 'Corporate MXN', maturity: '2027-06-10', couponRate: 5.5 },
  { id: 'cat-corp-cemex28', name: 'CEMEX 5.700% 2028', alias: 'CEMEX28', isin: 'MX0COR000003', type: 'Corporate MXN', maturity: '2028-01-11', couponRate: 5.7 },
  { id: 'cat-corp-oma28', name: 'OMA 5.875% 2028', alias: 'OMA28', isin: 'MX0COR000008', type: 'Corporate MXN', maturity: '2028-09-14', couponRate: 5.875 },
  { id: 'cat-corp-amx29', name: 'AMX 5.125% 2029', alias: 'AMX29', isin: 'MX0COR000006', type: 'Corporate MXN', maturity: '2029-03-01', couponRate: 5.125 },
  { id: 'cat-corp-gfinbur30', name: 'GFINBUR 6.250% 2030', alias: 'GFIN30', isin: 'MX0COR000007', type: 'Corporate MXN', maturity: '2030-05-20', couponRate: 6.25 },
  { id: 'cat-corp-femsa31', name: 'FEMSA 4.875% 2031', alias: 'FEMSA31', isin: 'MX0COR000009', type: 'Corporate MXN', maturity: '2031-11-12', couponRate: 4.875 },
  { id: 'cat-corp-walmex32', name: 'WALMEX 5.250% 2032', alias: 'WALMX32', isin: 'MX0COR000010', type: 'Corporate MXN', maturity: '2032-04-22', couponRate: 5.25 },

  // ── Corporate UDI (7 securities) ───────────────────────────────────────────
  { id: 'cat-cudi-pemex29', name: 'PEMEX UDI 4.00% 2029', alias: 'PEMEX29', isin: 'MX0CUD000001', type: 'Corporate UDI', maturity: '2029-06-15', couponRate: 4.0 },
  { id: 'cat-cudi-cfe30', name: 'CFE UDI 3.50% 2030', alias: 'CFE30', isin: 'MX0CUD000002', type: 'Corporate UDI', maturity: '2030-03-20', couponRate: 3.5 },
  { id: 'cat-cudi-cemex31', name: 'CEMEX UDI 4.25% 2031', alias: 'CEMEX31', isin: 'MX0CUD000003', type: 'Corporate UDI', maturity: '2031-09-10', couponRate: 4.25 },
  { id: 'cat-cudi-bimbo32', name: 'BIMBO UDI 3.75% 2032', alias: 'BIMBO32', isin: 'MX0CUD000004', type: 'Corporate UDI', maturity: '2032-06-08', couponRate: 3.75 },
  { id: 'cat-cudi-amx33', name: 'AMX UDI 4.00% 2033', alias: 'AMX33', isin: 'MX0CUD000005', type: 'Corporate UDI', maturity: '2033-02-14', couponRate: 4.0 },
  { id: 'cat-cudi-banorte34', name: 'BANORTE UDI 3.50% 2034', alias: 'BNORTE34', isin: 'MX0CUD000006', type: 'Corporate UDI', maturity: '2034-07-19', couponRate: 3.5 },
  { id: 'cat-cudi-femsa35', name: 'FEMSA UDI 4.25% 2035', alias: 'FEMSA35', isin: 'MX0CUD000007', type: 'Corporate UDI', maturity: '2035-11-21', couponRate: 4.25 },
];
