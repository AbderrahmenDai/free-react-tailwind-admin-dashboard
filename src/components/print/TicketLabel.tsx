import React from 'react';
import Barcode from 'react-barcode';

interface TicketLabelProps {
    of: {
        numeroOF: string;
        [key: string]: unknown;
    };
    hu: {
        numeroHU?: string;
        quantitePrevue?: number;
        compteurHU?: number;  // Persistent cumulative index saved in DB
        [key: string]: unknown;
    };
    reference: {
        designation?: string;
        indice?: string;
        codeReference?: string;
        referenceClient?: string;
        planificateurDeCode?: string;
        compteur?: string | number;
        [key: string]: unknown;
    };
    /** 1-based sequential index of this HU within the OF — drives the last 4 digits of the composite barcode */
    index?: number;
}

export const TicketLabel = React.forwardRef<HTMLDivElement, TicketLabelProps>(
    ({ of: ofData, hu, reference, index }, ref) => {
        // Date formatted as DD-MM-YYYY
        const dateStr = new Date()
            .toLocaleDateString('fr-FR')
            .replace(/\//g, '-');

        // ── Composite barcode: planificateur(6) + qty(3) + compteur(4) ──
        // Extract planificateur from referenceClient digits (e.g. L002525822NCP → digits "002525822" → [1..6] = "525822")
        const refClientStr = (reference.referenceClient as string | undefined) || '';
        const refClientDigits = refClientStr.replace(/\D/g, ''); // keep only digits → "002525822"
        const planificateur = refClientDigits.length >= 9
            ? refClientDigits.slice(3, 9)  // chars [3..8] e.g. "002525963" → "525963"
            : (
                (reference.planificateurDeCode as string | undefined) ||
                (reference.codeReference as string | undefined)?.slice(0, 6) ||
                '000000'
            ).padEnd(6, '0').slice(0, 6);

        const qty = String(hu.quantitePrevue ?? 0).padStart(3, '0');

        // Counter priority: 1) hu.compteurHU (persisted DB value) 2) index prop 3) fallback
        const compteur =
            hu.compteurHU != null
                ? String(hu.compteurHU).padStart(4, '0')
                : index != null
                    ? String(index).padStart(4, '0')
                    : (hu.numeroHU ?? '').slice(-4).padStart(4, '0');

        const compositeCode = `${planificateur}${qty}${compteur}`;

        // ── Customer code barcode: referenceClient + indice ──
        const baseCustomerCode =
            (reference.referenceClient as string | undefined) ||
            (reference.codeReference as string | undefined) ||
            'UNKNOWN';
        const indiceStr = (reference.indice as string | undefined) || '';
        const customerCode = indiceStr ? `${baseCustomerCode}${indiceStr}` : baseCustomerCode;

        // Safe barcode value (must be non-empty)
        const safeOf = ofData.numeroOF || '0000000';
        const safeCustomer = customerCode || 'UNKNOWN';
        const safeComposite = compositeCode || '0000000000000';

        return (
            <div
                ref={ref}
                style={{
                    width: '9cm',
                    minHeight: '13cm',
                    padding: '10px 12px',
                    border: '1px dashed #555',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#000',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                }}
            >
                {/* ── Row 1: Company name + Product type ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Tesca tunisia</span>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>TRIM COVER</span>
                </div>

                {/* ── Row 2: Date + WO ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>{dateStr}</span>
                    <span style={{ fontWeight: 'bold' }}>WO:&nbsp;&nbsp;{safeOf}</span>
                </div>

                {/* ── Row 3: Indice ── */}
                <div>
                    <span style={{ fontWeight: 'bold' }}>Indice:&nbsp;</span>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
                        {(reference.indice as string | undefined) || 'N/A'}
                    </span>
                </div>

                {/* ── Row 4: Full Designation ── */}
                <div style={{ fontWeight: 'bold', fontSize: '11px', wordBreak: 'break-word', marginTop: '2px' }}>
                    {(reference.designation as string | undefined) || '-'}
                </div>

                {/* ── Separator ── */}
                <div style={{ borderTop: '1px dashed #333', margin: '4px 0' }} />

                {/* ── Row 5: STL Part Number label ── */}
                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>STL PART NUMBER :</div>

                {/* ── Row 6: Part N° (left) + Customer code barcode (right) ── */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                    {/* Left: Part N° */}
                    <div style={{ minWidth: '55px', paddingBottom: '4px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold' }}>Part N°</div>
                    </div>

                    {/* Right: Customer code + barcode */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: '2px' }}>
                            Customer code
                        </div>
                        <Barcode
                            value={safeCustomer}
                            width={1.2}
                            height={38}
                            fontSize={10}
                            margin={0}
                            displayValue={true}
                            textAlign="center"
                            font="monospace"
                        />
                    </div>
                </div>

                {/* ── Separator ── */}
                <div style={{ borderTop: '1px dashed #333', margin: '4px 0' }} />

                {/* ── Row 7: Composite barcode (compteur) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Barcode
                        value={safeComposite}
                        width={1.5}
                        height={46}
                        fontSize={12}
                        margin={0}
                        displayValue={true}
                        textAlign="center"
                        font="monospace"
                    />
                </div>

                {/* ── Separator ── */}
                <div style={{ borderTop: '1px dashed #333', margin: '4px 0' }} />

                {/* ── Row 8: OF label + OF barcode ── */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                        OF:&nbsp;&nbsp;{safeOf}
                    </div>
                    <Barcode
                        value={safeOf}
                        width={1.5}
                        height={34}
                        fontSize={0}
                        margin={0}
                        displayValue={false}
                    />
                </div>
            </div>
        );
    }
);

TicketLabel.displayName = 'TicketLabel';

export default TicketLabel;
