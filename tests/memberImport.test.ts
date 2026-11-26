import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
    readImportFile,
    detectHeader,
    normalizeCpf,
    normalizePhone,
    parseDateBR,
    parseMoney,
    parseStatus,
    prettifyName,
    monthsFromPlanName,
} from '../src/services/gym/import/memberImportParser';

const b64 = (buf: Buffer) => buf.toString('base64');

test('CSV Latin-1 com ; e linhas de título antes do cabeçalho', () => {
    const text = 'Relatório de Pessoas\r\nEmitido em: 25/11/2026\r\n\r\nNúmero;Nome;CPF;Celular;Data Nascimento;Situação\r\n1;JOÃO DA SILVA;529.982.247-25;(35) 99811-2233;15/03/1995;Ativo\r\n';
    const t = readImportFile(b64(Buffer.from(text, 'latin1')), 'x.csv');
    assert.equal(t.format, 'csv');
    assert.equal(t.encoding, 'latin1');
    assert.equal(t.delimiter, ';');
    const h = detectHeader(t.rows);
    assert.equal(h.headerRow, 3);
    assert.deepEqual(h.mapping, { externalCode: 0, name: 1, cpf: 2, phone: 3, birthDate: 4, status: 5 });
    assert.equal(t.rows[4]![1], 'JOÃO DA SILVA');
});

test('CSV UTF-8 com BOM, vírgula e aspas', () => {
    const text = '\ufeffNome,E-mail,Telefone,Celular\n"Silva, Ana",ana@x.com,(35) 3721-1234,35 99811-2233\n';
    const t = readImportFile(b64(Buffer.from(text, 'utf8')), 'x.csv');
    assert.equal(t.encoding, 'utf-8');
    assert.equal(t.delimiter, ',');
    assert.equal(t.rows[1]![0], 'Silva, Ana');
    const h = detectHeader(t.rows);
    assert.equal(h.mapping.phone, 3, 'celular vira o telefone principal');
    assert.equal(h.mapping.phone2, 2);
});

test('XLSX com datas reais e CPF numérico sem zero à esquerda', () => {
    const ws = XLSX.utils.aoa_to_sheet([
        ['Relatório'],
        [],
        ['Nome', 'CPF', 'Nascimento', 'Vencimento', 'Senha'],
        ['Maria', 1152449303, new Date(Date.UTC(1988, 10, 2, 12)), new Date(Date.UTC(2027, 0, 4, 12)), 2345],
    ], { cellDates: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pessoas');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const t = readImportFile(b64(buf), 'a.xlsx');
    assert.equal(t.format, 'xlsx');
    const h = detectHeader(t.rows);
    assert.equal(h.headerRow, 2);
    const row = t.rows[3]!;
    assert.equal(normalizeCpf(row[1]!).value, '01152449303');
    assert.equal(parseDateBR(row[2]!).value, '1988-11-02');
    assert.equal(parseDateBR(row[3]!).value, '2027-01-04');
    assert.equal(row[4], '2345');
});

test('normalizações de valores', () => {
    assert.equal(normalizeCpf('529.982.247-25').value, '52998224725');
    assert.equal(normalizeCpf('123.456.789-00').invalid, true);
    assert.equal(normalizePhone('+55 (35) 99811-2233').value, '35998112233');
    assert.equal(normalizePhone('(35) 9981').invalid, true);
    assert.equal(parseDateBR('31/02/1990').invalid, true);
    assert.equal(parseDateBR('05/11/26').value, '2026-11-05');
    assert.equal(parseDateBR('2026-11-05').value, '2026-11-05');
    assert.equal(parseDateBR('').value, null);
    assert.equal(parseMoney('R$ 1.234,56').value, 1234.56);
    assert.equal(parseMoney('99.9').value, 99.9);
    assert.equal(parseStatus('Inativo').value, 'INACTIVE');
    assert.equal(parseStatus('ATIVO').value, 'ACTIVE');
    assert.equal(prettifyName('JOÃO PEDRO DA SILVA'), 'João Pedro da Silva');
    assert.equal(prettifyName('Ana McLaren'), 'Ana McLaren');
    assert.equal(monthsFromPlanName('Musculação Trimestral'), 3);
    assert.equal(monthsFromPlanName('MUSCULAÇÃO MENSAL'), 1);
});
