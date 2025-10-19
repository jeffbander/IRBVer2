export const roles = [
  { id: 'pi', name: 'Principal Investigator' },
  { id: 'co_i', name: 'Co-Investigator' },
  { id: 'coordinator', name: 'Study Coordinator' },
  { id: 'regulatory', name: 'Regulatory Specialist' },
  { id: 'dept_admin', name: 'Department Admin' },
  { id: 'irb_liaison', name: 'IRB Liaison' },
  { id: 'finance', name: 'Finance' },
  { id: 'viewer', name: 'Viewer' },
];

export const people = [
  { id: 'u_pi_lee', name: 'Dr. Pat Lee', email: 'p.lee@example.edu', roleIds: ['pi'] },
  { id: 'u_coord_rivera', name: 'Alex Rivera', email: 'a.rivera@example.edu', roleIds: ['coordinator'] },
  { id: 'u_reg_singh', name: 'Mira Singh', email: 'm.singh@example.edu', roleIds: ['regulatory'] },
  { id: 'u_dept_nguyen', name: 'Kim Nguyen', email: 'k.nguyen@example.edu', roleIds: ['dept_admin'] },
  { id: 'u_fin_carter', name: 'Jordan Carter', email: 'j.carter@example.edu', roleIds: ['finance'] },
  { id: 'u_irb_chen', name: 'Robin Chen', email: 'r.chen@example.edu', roleIds: ['irb_liaison'] },
];

export const taskTemplates = [
  {
    id: 'tmpl_drug_ind',
    name: 'Drug (IND) new study',
    tasks: [
      { title: 'Draft protocol', role: 'pi', offset_days: 0 },
      { title: 'Draft consent', role: 'coordinator', offset_days: 0 },
      { title: 'Confirm IND applicability and capture IND #', role: 'regulatory', offset_days: 0 },
      { title: 'Department/Chair pre-review', role: 'dept_admin', offset_days: 3 },
      { title: 'Assemble IRB submission packet', role: 'regulatory', offset_days: 5 },
      { title: 'Submit to IRB', role: 'pi', offset_days: 7 },
      { title: 'Respond to IRB modifications (if requested)', role: 'regulatory', offset_days: 14 },
    ],
  },
  {
    id: 'tmpl_device_ide',
    name: 'Device (IDE) new study',
    tasks: [
      { title: 'Draft protocol', role: 'pi', offset_days: 0 },
      { title: 'Draft consent', role: 'coordinator', offset_days: 0 },
      { title: 'Capture IDE # and risk category', role: 'regulatory', offset_days: 0 },
      { title: 'Department/Chair pre-review', role: 'dept_admin', offset_days: 3 },
      { title: 'Assemble IRB submission packet', role: 'regulatory', offset_days: 5 },
      { title: 'Submit to IRB', role: 'pi', offset_days: 7 },
    ],
  },
  {
    id: 'tmpl_behavioral',
    name: 'Behavioral minimal risk',
    tasks: [
      { title: 'Draft protocol', role: 'pi', offset_days: 0 },
      { title: 'Determine exempt vs expedited', role: 'regulatory', offset_days: 2 },
      { title: 'Assemble IRB submission packet', role: 'regulatory', offset_days: 5 },
      { title: 'Submit to IRB', role: 'pi', offset_days: 7 },
    ],
  },
  {
    id: 'tmpl_observational',
    name: 'Observational minimal risk',
    tasks: [
      { title: 'Draft protocol', role: 'pi', offset_days: 0 },
      { title: 'Data use & privacy review (internal)', role: 'regulatory', offset_days: 2 },
      { title: 'Assemble IRB submission packet', role: 'regulatory', offset_days: 5 },
      { title: 'Submit to IRB', role: 'pi', offset_days: 7 },
    ],
  },
  {
    id: 'tmpl_registry',
    name: 'Registry setup',
    tasks: [
      { title: 'Draft protocol/charter', role: 'pi', offset_days: 0 },
      { title: 'Data governance checklist', role: 'regulatory', offset_days: 2 },
      { title: 'Assemble IRB submission packet', role: 'regulatory', offset_days: 5 },
      { title: 'Submit to IRB', role: 'pi', offset_days: 7 },
    ],
  },
  {
    id: 'tmpl_generic',
    name: 'Generic research',
    tasks: [
      { title: 'Draft protocol', role: 'pi', offset_days: 0 },
      { title: 'Assemble IRB submission packet', role: 'regulatory', offset_days: 5 },
      { title: 'Submit to IRB', role: 'pi', offset_days: 7 },
    ],
  },
];

export const studyTypes = [
  {
    id: 'drug_ind',
    name: 'Drug (IND)',
    description: 'Drug study under IND regulations',
    regulatedFields: { fields: ['ind_number', 'sponsor'] },
    defaultTaskTemplateId: 'tmpl_drug_ind',
  },
  {
    id: 'device_ide',
    name: 'Device (IDE)',
    description: 'Device study under IDE regulations',
    regulatedFields: { fields: ['ide_number', 'device_risk_category', 'sponsor'] },
    defaultTaskTemplateId: 'tmpl_device_ide',
  },
  {
    id: 'behavioral',
    name: 'Behavioral',
    description: 'Behavioral research',
    regulatedFields: { fields: [] },
    defaultTaskTemplateId: 'tmpl_behavioral',
  },
  {
    id: 'observational',
    name: 'Observational',
    description: 'Observational research',
    regulatedFields: { fields: [] },
    defaultTaskTemplateId: 'tmpl_observational',
  },
  {
    id: 'registry',
    name: 'Registry',
    description: 'Registry setup',
    regulatedFields: { fields: [] },
    defaultTaskTemplateId: 'tmpl_registry',
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Other research type',
    regulatedFields: { fields: [] },
    defaultTaskTemplateId: 'tmpl_generic',
  },
];
