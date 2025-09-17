import { Pool } from 'pg';
import {
  ExportRequest,
  ExportParameters,
  ExportFormat,
  FormResponse,
  Visit,
  Participant,
  Study
} from '@research-study/shared';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs/promises';

interface CDISCDomain {
  name: string;
  label: string;
  records: Record<string, any>[];
}

export class CDISCExporter {
  constructor(private db: Pool) {}

  async exportToSDTM(
    studyId: string,
    parameters: ExportParameters,
    outputPath: string
  ): Promise<string> {
    try {
      // Get study information
      const study = await this.getStudyInfo(studyId);

      // Build CDISC domains
      const domains = await this.buildSDTMDomains(studyId, parameters);

      // Create output directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportDir = path.join(outputPath, `CDISC_SDTM_${study.protocolNumber}_${timestamp}`);
      await fs.mkdir(exportDir, { recursive: true });

      // Export domains to separate SAS datasets (Excel for now)
      const workbook = XLSX.utils.book_new();

      for (const domain of domains) {
        // Create worksheet for domain
        const worksheet = XLSX.utils.json_to_sheet(domain.records);

        // Add domain to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, domain.name);

        // Also create individual domain file
        const domainWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(domainWorkbook, worksheet, domain.name);

        const domainFilePath = path.join(exportDir, `${domain.name.toLowerCase()}.xlsx`);
        XLSX.writeFile(domainWorkbook, domainFilePath);
      }

      // Create combined file
      const combinedFilePath = path.join(exportDir, 'sdtm_combined.xlsx');
      XLSX.writeFile(workbook, combinedFilePath);

      // Create metadata files
      await this.createDefineXML(domains, study, path.join(exportDir, 'define.xml'));
      await this.createStudyMetadata(study, domains, path.join(exportDir, 'study_metadata.json'));

      return exportDir;
    } catch (error) {
      console.error('Error exporting CDISC SDTM:', error);
      throw error;
    }
  }

  private async buildSDTMDomains(
    studyId: string,
    parameters: ExportParameters
  ): Promise<CDISCDomain[]> {
    const domains: CDISCDomain[] = [];

    // Demographics (DM) Domain
    domains.push(await this.buildDemographicsDomain(studyId, parameters));

    // Subject Visits (SV) Domain
    domains.push(await this.buildSubjectVisitsDomain(studyId, parameters));

    // Form Data (Custom Domains)
    const formDomains = await this.buildFormDataDomains(studyId, parameters);
    domains.push(...formDomains);

    // Comments (CO) Domain for queries
    domains.push(await this.buildCommentsDomain(studyId, parameters));

    // Supplemental Qualifiers (SUPP--) Domains
    const suppDomains = await this.buildSupplementalDomains(studyId, parameters);
    domains.push(...suppDomains);

    return domains;
  }

  private async buildDemographicsDomain(
    studyId: string,
    parameters: ExportParameters
  ): Promise<CDISCDomain> {
    const query = `
      SELECT
        p.external_id as usubjid,
        p.age,
        p.gender as sex,
        p.race,
        p.ethnicity,
        p.enrollment_date as rfstdtc,
        p.withdrawal_date as rfendtc,
        p.completion_date as rfcpltdtc,
        p.status as dmdtc,
        p.randomization_arm as arm,
        s.protocol_number as studyid
      FROM participants p
      JOIN studies s ON p.study_id = s.id
      WHERE p.study_id = $1
      ${this.buildDateFilter('p.enrollment_date', parameters.dateRange)}
      ${this.buildParticipantFilter(parameters.participants)}
      ORDER BY p.external_id
    `;

    const result = await this.db.query(query, [studyId]);

    const records = result.rows.map((row: any, index: number) => ({
      STUDYID: row.studyid,
      DOMAIN: 'DM',
      USUBJID: row.usubjid,
      SUBJID: row.usubjid,
      RFSTDTC: this.formatDate(row.rfstdtc),
      RFENDTC: this.formatDate(row.rfendtc),
      RFCPLTDTC: this.formatDate(row.rfcpltdtc),
      SITEID: '001', // Placeholder - would come from site data
      AGE: row.age,
      AGEU: row.age ? 'YEARS' : null,
      SEX: this.standardizeSex(row.sex),
      RACE: this.standardizeRace(row.race),
      ETHNIC: this.standardizeEthnicity(row.ethnicity),
      ARM: row.arm,
      ACTARM: row.arm,
      DMSEQ: index + 1
    }));

    return {
      name: 'DM',
      label: 'Demographics',
      records
    };
  }

  private async buildSubjectVisitsDomain(
    studyId: string,
    parameters: ExportParameters
  ): Promise<CDISCDomain> {
    const query = `
      SELECT
        p.external_id as usubjid,
        v.id as visitnum,
        vd.name as visit,
        v.scheduled_date as svstdtc,
        v.actual_date as svendtc,
        v.status as svstat,
        vd.visit_number as visitdy,
        s.protocol_number as studyid
      FROM visits v
      JOIN participants p ON v.participant_id = p.id
      JOIN visit_definitions vd ON v.visit_definition_id = vd.id
      JOIN studies s ON v.study_id = s.id
      WHERE v.study_id = $1
      ${this.buildDateFilter('v.scheduled_date', parameters.dateRange)}
      ${this.buildParticipantFilter(parameters.participants, 'p')}
      ORDER BY p.external_id, vd.visit_number
    `;

    const result = await this.db.query(query, [studyId]);

    const records = result.rows.map((row: any, index: number) => ({
      STUDYID: row.studyid,
      DOMAIN: 'SV',
      USUBJID: row.usubjid,
      VISITNUM: row.visitdy,
      VISIT: row.visit,
      VISITDY: row.visitdy,
      SVSTDTC: this.formatDate(row.svstdtc),
      SVENDTC: this.formatDate(row.svendtc),
      SVSTAT: this.standardizeVisitStatus(row.svstat),
      SVSEQ: index + 1
    }));

    return {
      name: 'SV',
      label: 'Subject Visits',
      records
    };
  }

  private async buildFormDataDomains(
    studyId: string,
    parameters: ExportParameters
  ): Promise<CDISCDomain[]> {
    const domains: CDISCDomain[] = [];

    // Get all forms for the study
    const formsQuery = `
      SELECT DISTINCT f.id, f.name, f.title, f.schema
      FROM forms f
      JOIN form_responses fr ON f.id = fr.form_id
      JOIN participants p ON fr.participant_id = p.id
      WHERE p.study_id = $1
      ${this.buildFormFilter(parameters.forms, 'f')}
      ORDER BY f.name
    `;

    const formsResult = await this.db.query(formsQuery, [studyId]);

    for (const form of formsResult.rows) {
      const domain = await this.buildFormDataDomain(studyId, form, parameters);
      if (domain.records.length > 0) {
        domains.push(domain);
      }
    }

    return domains;
  }

  private async buildFormDataDomain(
    studyId: string,
    form: any,
    parameters: ExportParameters
  ): Promise<CDISCDomain> {
    const domainCode = this.generateDomainCode(form.name);

    const query = `
      SELECT
        p.external_id as usubjid,
        fr.data,
        fr.submitted_at as dtc,
        v.id as visitnum,
        vd.visit_number as visitdy,
        s.protocol_number as studyid,
        fr.id as response_id
      FROM form_responses fr
      JOIN participants p ON fr.participant_id = p.id
      JOIN studies s ON p.study_id = s.id
      LEFT JOIN visits v ON fr.visit_id = v.id
      LEFT JOIN visit_definitions vd ON v.visit_definition_id = vd.id
      WHERE p.study_id = $1 AND fr.form_id = $2
      ${this.buildDateFilter('fr.submitted_at', parameters.dateRange)}
      ${this.buildParticipantFilter(parameters.participants, 'p')}
      AND fr.status IN ('SUBMITTED', 'APPROVED', 'LOCKED')
      ORDER BY p.external_id, vd.visit_number
    `;

    const result = await this.db.query(query, [studyId, form.id]);

    const records: Record<string, any>[] = [];
    const schema = form.schema;

    result.rows.forEach((row: any, index: number) => {
      const baseRecord = {
        STUDYID: row.studyid,
        DOMAIN: domainCode,
        USUBJID: row.usubjid,
        VISITNUM: row.visitdy,
        VISITDY: row.visitdy,
        [`${domainCode}DTC`]: this.formatDate(row.dtc),
        [`${domainCode}SEQ`]: index + 1
      };

      // Process form fields
      const formData = row.data || {};
      schema.fields.forEach((field: any) => {
        const value = formData[field.id];
        if (value !== undefined && value !== null && value !== '') {
          const cdiscVar = this.mapFieldToCDISC(field, domainCode);
          baseRecord[cdiscVar.name] = this.formatFieldValue(field, value);
        }
      });

      records.push(baseRecord);
    });

    return {
      name: domainCode,
      label: form.title,
      records
    };
  }

  private async buildCommentsDomain(
    studyId: string,
    parameters: ExportParameters
  ): Promise<CDISCDomain> {
    const query = `
      SELECT
        p.external_id as usubjid,
        q.subject as coval,
        q.description as comment,
        q.created_at as codtc,
        q.type as cotyp,
        q.priority as copri,
        s.protocol_number as studyid
      FROM queries q
      JOIN participants p ON q.participant_id = p.id
      JOIN studies s ON q.study_id = s.id
      WHERE q.study_id = $1
      ${this.buildDateFilter('q.created_at', parameters.dateRange)}
      ${this.buildParticipantFilter(parameters.participants, 'p')}
      ORDER BY p.external_id, q.created_at
    `;

    const result = await this.db.query(query, [studyId]);

    const records = result.rows.map((row: any, index: number) => ({
      STUDYID: row.studyid,
      DOMAIN: 'CO',
      USUBJID: row.usubjid,
      COVAL: row.coval,
      COTYP: row.cotyp,
      CODTC: this.formatDate(row.codtc),
      COSEQ: index + 1
    }));

    return {
      name: 'CO',
      label: 'Comments',
      records
    };
  }

  private async buildSupplementalDomains(
    studyId: string,
    parameters: ExportParameters
  ): Promise<CDISCDomain[]> {
    // Build supplemental qualifier domains for additional data
    // This would contain metadata and derived variables
    return [];
  }

  private async createDefineXML(
    domains: CDISCDomain[],
    study: any,
    filePath: string
  ): Promise<void> {
    // Create CDISC Define-XML file
    const defineXML = `<?xml version="1.0" encoding="UTF-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     xmlns:def="http://www.cdisc.org/ns/def/v2.0"
     CreationDateTime="${new Date().toISOString()}"
     ODMVersion="1.3.2"
     FileType="Snapshot"
     SourceSystem="Research Study Management System"
     SourceSystemVersion="1.0">

  <Study OID="${study.protocolNumber}">
    <GlobalVariables>
      <StudyName>${study.title}</StudyName>
      <StudyDescription>${study.description}</StudyDescription>
      <ProtocolName>${study.protocolNumber}</ProtocolName>
    </GlobalVariables>

    <MetaDataVersion OID="SDTM.1.0" Name="Study Data Tabulation Model">
      ${domains.map(domain => `
      <ItemGroupDef OID="${domain.name}" Name="${domain.name}" Repeating="Yes"
                    SASDatasetName="${domain.name}" Domain="${domain.name}"
                    def:Label="${domain.label}">
        ${this.generateItemDefs(domain)}
      </ItemGroupDef>`).join('')}
    </MetaDataVersion>
  </Study>
</ODM>`;

    await fs.writeFile(filePath, defineXML, 'utf8');
  }

  private async createStudyMetadata(
    study: any,
    domains: CDISCDomain[],
    filePath: string
  ): Promise<void> {
    const metadata = {
      study: {
        protocolNumber: study.protocolNumber,
        title: study.title,
        description: study.description,
        exportDate: new Date().toISOString(),
        cdiscVersion: 'SDTM 3.3'
      },
      domains: domains.map(domain => ({
        name: domain.name,
        label: domain.label,
        recordCount: domain.records.length,
        variables: domain.records.length > 0 ? Object.keys(domain.records[0]) : []
      }))
    };

    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  // Helper methods
  private async getStudyInfo(studyId: string): Promise<any> {
    const query = 'SELECT * FROM studies WHERE id = $1';
    const result = await this.db.query(query, [studyId]);
    return result.rows[0];
  }

  private buildDateFilter(dateColumn: string, dateRange?: any): string {
    if (!dateRange) return '';

    let filter = '';
    if (dateRange.start) {
      filter += ` AND ${dateColumn} >= '${dateRange.start.toISOString()}'`;
    }
    if (dateRange.end) {
      filter += ` AND ${dateColumn} <= '${dateRange.end.toISOString()}'`;
    }
    return filter;
  }

  private buildParticipantFilter(participants?: string[], alias = ''): string {
    if (!participants || participants.length === 0) return '';

    const prefix = alias ? `${alias}.` : '';
    const placeholders = participants.map((_, index) => `$${index + 2}`).join(',');
    return ` AND ${prefix}external_id IN (${placeholders})`;
  }

  private buildFormFilter(forms?: string[], alias = ''): string {
    if (!forms || forms.length === 0) return '';

    const prefix = alias ? `${alias}.` : '';
    const placeholders = forms.map((_, index) => `$${index + 2}`).join(',');
    return ` AND ${prefix}id IN (${placeholders})`;
  }

  private formatDate(date: any): string | null {
    if (!date) return null;
    return new Date(date).toISOString().split('T')[0];
  }

  private standardizeSex(sex: string): string {
    if (!sex) return '';
    const normalized = sex.toUpperCase();
    if (normalized.includes('M')) return 'M';
    if (normalized.includes('F')) return 'F';
    return 'U'; // Unknown
  }

  private standardizeRace(race: string): string {
    if (!race) return '';
    // Map to CDISC controlled terminology
    const raceMap: Record<string, string> = {
      'WHITE': 'WHITE',
      'BLACK': 'BLACK OR AFRICAN AMERICAN',
      'ASIAN': 'ASIAN',
      'HISPANIC': 'OTHER',
      'OTHER': 'OTHER',
      'UNKNOWN': 'NOT REPORTED'
    };
    return raceMap[race.toUpperCase()] || 'OTHER';
  }

  private standardizeEthnicity(ethnicity: string): string {
    if (!ethnicity) return '';
    const ethnicityMap: Record<string, string> = {
      'HISPANIC': 'HISPANIC OR LATINO',
      'NOT HISPANIC': 'NOT HISPANIC OR LATINO',
      'UNKNOWN': 'NOT REPORTED'
    };
    return ethnicityMap[ethnicity.toUpperCase()] || 'NOT REPORTED';
  }

  private standardizeVisitStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'COMPLETED': 'COMPLETED',
      'MISSED': 'NOT DONE',
      'CANCELLED': 'NOT DONE',
      'SCHEDULED': 'PLANNED',
      'IN_PROGRESS': 'ONGOING'
    };
    return statusMap[status] || status;
  }

  private generateDomainCode(formName: string): string {
    // Generate 2-character domain code from form name
    return formName.substring(0, 2).toUpperCase();
  }

  private mapFieldToCDISC(field: any, domainCode: string): { name: string; type: string } {
    // Map form field to CDISC variable name
    const baseVar = field.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const varName = `${domainCode}${baseVar}`;

    return {
      name: varName.substring(0, 8), // CDISC variable names max 8 chars
      type: this.getCDISCDataType(field.type)
    };
  }

  private getCDISCDataType(fieldType: string): string {
    const typeMap: Record<string, string> = {
      'TEXT': 'text',
      'TEXTAREA': 'text',
      'NUMBER': 'float',
      'DATE': 'date',
      'DATETIME': 'datetime',
      'BOOLEAN': 'text',
      'SELECT': 'text',
      'RADIO': 'text'
    };
    return typeMap[fieldType] || 'text';
  }

  private formatFieldValue(field: any, value: any): any {
    if (field.type === 'DATE' && value) {
      return this.formatDate(value);
    }
    if (field.type === 'BOOLEAN') {
      return value ? 'Y' : 'N';
    }
    return value;
  }

  private generateItemDefs(domain: CDISCDomain): string {
    if (domain.records.length === 0) return '';

    const variables = Object.keys(domain.records[0]);
    return variables.map(varName => `
        <ItemDef OID="${varName}" Name="${varName}" DataType="text" Length="200">
          <Description>
            <TranslatedText xml:lang="en">${varName}</TranslatedText>
          </Description>
        </ItemDef>`).join('');
  }
}