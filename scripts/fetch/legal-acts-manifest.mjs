// Every budget and final-accounts act behind the central budget figures. `docid` is the
// identifier used by Parliament's law collection (mkogy.jogtar.hu) and net.jogtar.hu.
const budget = {
  2000: '99900125', 2001: 'a0000133', 2002: 'a0000133', 2003: 'a0200062', 2004: 'a0300116', 2005: 'a0400135',
  2006: 'a0500153', 2007: 'a0600127', 2008: 'a0700169', 2009: 'a0800102', 2010: 'a0900130', 2011: 'a1000169',
  2012: 'a1100188', 2013: 'a1200204', 2014: 'a1300230', 2015: 'a1400100', 2016: 'a1500100', 2017: 'a1600090',
  2018: 'a1700100', 2019: 'a1800050', 2020: 'a1900071', 2021: 'a2000090', 2022: 'a2100090', 2023: 'a2200025',
  2024: 'a2300055', 2025: 'a2400090', 2026: 'a2500069',
};

const finalAccounts = {
  2000: 'a0100075', 2001: 'a0200040', 2002: 'a0300095', 2003: 'a0400100', 2004: 'a0500118', 2005: 'a0600099',
  2006: 'a0700128', 2007: 'a0800078', 2008: 'a0900129', 2009: 'a1000098', 2010: 'a1100133', 2011: 'a1200155',
  2012: 'a1300193', 2013: 'a1400062', 2014: 'a1500172', 2015: 'a1600122', 2016: 'a1700170', 2017: 'a1800084',
  2018: 'a1900079', 2019: 'a2000117', 2020: 'a2100116', 2021: 'a2200072', 2022: 'a2300073', 2023: 'a2400048',
  2024: 'a2500085',
};

// Budget years whose consolidated text is online: the current text carries the last statutory main sums.
const consolidated = [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2018, 2023, 2024, 2025, 2026];

// Other years: amending acts, oldest first. The last one restating the main sums wins.
const amendments = {
  2010: ['a1000076', 'a1000079', 'a1000097', 'a1000102', 'a1000143'],
  2011: ['a1100032', 'a1100068', 'a1100114'],
  2012: ['a1200020', 'a1200057', 'a1200067', 'a1200083', 'a1200115', 'a1200133', 'a1200139', 'a1200153', 'a1200177', 'a1200187'],
  2013: ['a1300003', 'a1300011', 'a1300031', 'a1300092', 'a1300124', 'a1300144', 'a1300206'],
  2014: ['a1400084'],
  2015: ['a1500073', 'a1500144', 'a1500149', 'a1500164'],
  2016: ['a1600076'],
  2017: ['a1700086'],
  2020: ['a2000060'],
  2021: ['a2100044', 'a2100088'],
};

// The 2001-02 act sets both years in one section; the 2004 act places its main sums in 5. §.
const anchors = {
  'budget:2001': /1\. § \(1\) Az Országgyűlés a 2001\. évi/,
  'budget:2002': /\(2\) Az Országgyűlés a 2002\. évi központi/,
  'budget:2004': /5\. § Az Országgyűlés a 2004\. évi/,
  'consolidated:2001': /1\. § \(1\) Az Országgyűlés a 2001\. évi/,
  'consolidated:2002': /\(2\) \*? ?Az Országgyűlés a 2002\. évi központi/,
  'consolidated:2004': /5\. § \*? ?Az Országgyűlés a 2004\. évi/,
};

export { amendments, anchors, budget, consolidated, finalAccounts };
