/**
 * c:\Users\AAAA\Desktop\sitey-caixa\hipocampo_ia.js
 * 
 * HIPOCAMPO IA - Núcleo de Inteligência e Memória do Sistema Psyzon
 * Responsável por registrar eventos, aprender padrões, calcular previsões e gerar insights.
 */

(function(window) {
    'use strict';

    // --- CONFIGURAÇÃO & CONSTANTES ---
    const DB_VERSION = 'hipocampo_db_v1';
    const HOLIDAYS_BR = [
        "01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25",
        // Adicionar datas móveis manualmente ou via algoritmo se necessário
        "2025-03-04", "2025-04-18", "2025-06-19"
    ];

    // --- ADAPTADOR DE ARMAZENAMENTO (PATTERN PARA FIREBASE FUTURO) ---
    const StorageAdapter = {
        async load() {
            // Futuro: return await firebase.firestore().collection('hipocampo').doc('main').get();
            const data = localStorage.getItem(DB_VERSION);
            return data ? JSON.parse(data) : { events: [], version: 1 };
        },
        async save(data) {
            // Futuro: await firebase.firestore().collection('hipocampo').doc('main').set(data);
            localStorage.setItem(DB_VERSION, JSON.stringify(data));
        }
    };

    // --- MOTOR MATEMÁTICO (ESTATÍSTICA) ---
    const MathEngine = {
        // Calcula média, mediana, desvio padrão e remove outliers
        analyze(numbers) {
            if (!numbers || numbers.length === 0) return null;
            
            // Ordenar para mediana
            numbers.sort((a, b) => a - b);

            // Média Simples
            const sum = numbers.reduce((a, b) => a + b, 0);
            const mean = sum / numbers.length;

            // Desvio Padrão
            const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
            const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
            const stdDev = Math.sqrt(avgSquareDiff);

            // Remoção de Outliers (Regra: Média ± 2 * Desvio Padrão)
            // Isso evita que um erro de digitação (ex: 1000kg em vez de 10kg) estrague o aprendizado
            const cleanNumbers = numbers.filter(n => n >= (mean - 2 * stdDev) && n <= (mean + 2 * stdDev));
            
            // Recalcular com dados limpos
            const cleanSum = cleanNumbers.reduce((a, b) => a + b, 0);
            const cleanMean = cleanNumbers.length > 0 ? cleanSum / cleanNumbers.length : 0;
            const min = cleanNumbers.length > 0 ? cleanNumbers[0] : 0;
            const max = cleanNumbers.length > 0 ? cleanNumbers[cleanNumbers.length - 1] : 0;

            // Confiança baseada no tamanho da amostra
            let confidence = 'Baixa';
            if (cleanNumbers.length >= 5) confidence = 'Média';
            if (cleanNumbers.length >= 20) confidence = 'Alta';

            return {
                mean: cleanMean,
                rawMean: mean,
                min,
                max,
                stdDev,
                sampleSize: cleanNumbers.length,
                totalSamples: numbers.length,
                confidence
            };
        },

        // Cálculo de dias úteis
        addBusinessDays(date, days) {
            let result = new Date(date);
            let added = 0;
            while (added < days) {
                result.setDate(result.getDate() + 1);
                if (this.isBusinessDay(result)) added++;
            }
            return result;
        },

        countBusinessDays(startDate, endDate) {
            let count = 0;
            let curDate = new Date(startDate);
            const end = new Date(endDate);
            while (curDate <= end) {
                if (this.isBusinessDay(curDate)) count++;
                curDate.setDate(curDate.getDate() + 1);
            }
            return count;
        },

        isBusinessDay(date) {
            const day = date.getDay();
            if (day === 0 || day === 6) return false; // Fim de semana
            const dateStr = date.toISOString().split('T')[0];
            const mmdd = dateStr.substring(5);
            if (HOLIDAYS_BR.includes(mmdd) || HOLIDAYS_BR.includes(dateStr)) return false;
            return true;
        }
    };

    // --- CLASSE PRINCIPAL ---
    class HipocampoCore {
        constructor() {
            this.db = { events: [], version: 1 };
            this.init();
        }

        async init() {
            this.db = await StorageAdapter.load();
            console.log(`🧠 Hipocampo IA carregado. ${this.db.events.length} memórias.`);
        }

        // 1. REGISTRO DE EVENTOS
        async recordEvent(type, payload, meta = {}) {
            const event = {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                type,
                payload,
                meta: {
                    timestamp: new Date().toISOString(),
                    userId: meta.userId || 'system',
                    orderId: meta.orderId || null,
                    customerId: meta.customerId || null,
                    ...meta
                }
            };

            // Validação Anti-Cagada (Outlier Check na Entrada)
            if (this._isPotentialOutlier(type, payload)) {
                if (!confirm(`⚠️ Hipocampo IA:\nO valor informado parece muito fora do padrão histórico.\nDeseja salvar mesmo assim?`)) {
                    return null;
                }
            }

            this.db.events.push(event);
            await StorageAdapter.save(this.db);
            // console.log(`🧠 Memória salva: `, payload);
            return event;
        }

        _isPotentialOutlier(type, payload) {
            // Exemplo: Se rendimento de malha for > 20 peças/kg (improvável para camisetas normais)
            if (type === 'fabric_usage' && payload.piecesPerKg > 20) return true;
            if (type === 'fabric_usage' && payload.piecesPerKg < 1) return true;
            return false;
        }

        // 2. MÓDULOS DE APRENDIZADO (GETTERS INTELIGENTES)

        // 2.1 MATERIAIS
        getMaterialInsights(fabricType = null) {
            let events = this.db.events.filter(e => e.type === 'fabric_usage');
            if (fabricType) {
                events = events.filter(e => e.payload.fabricType && e.payload.fabricType.toLowerCase().includes(fabricType.toLowerCase()));
            }

            const yields = events.map(e => {
                // Tenta calcular peças por KG
                if (e.payload.kg && e.payload.pieces) return e.payload.pieces / e.payload.kg;
                return null;
            }).filter(n => n !== null);

            const stats = MathEngine.analyze(yields);
            return {
                type: 'Rendimento (Peças/Kg)',
                stats,
                suggestion: stats ? `Estimativa: ${stats.mean.toFixed(1)} peças por Kg` : 'Sem dados suficientes'
            };
        }

        // 2.2 TEMPO (PRAZOS)
        getTimeInsights() {
            // Agrupa eventos por OrderID para calcular deltas
            const orders = {};
            this.db.events.forEach(e => {
                if (!e.meta.orderId) return;
                if (!orders[e.meta.orderId]) orders[e.meta.orderId] = {};
                orders[e.meta.orderId][e.type] = new Date(e.meta.timestamp);
            });

            const leadTimes = []; // Dias totais
            const artTimes = []; // Criação -> Aprovação

            Object.values(orders).forEach(o => {
                if (o.order_created && o.order_produced) {
                    const days = MathEngine.countBusinessDays(o.order_created, o.order_produced);
                    leadTimes.push(days);
                }
                if (o.art_sent && o.art_approved) {
                    const days = MathEngine.countBusinessDays(o.art_sent, o.art_approved);
                    artTimes.push(days);
                }
            });

            return {
                production: MathEngine.analyze(leadTimes),
                art: MathEngine.analyze(artTimes)
            };
        }

        // 2.3 ARTE (GARGALOS)
        getArtInsights() {
            const events = this.db.events.filter(e => e.type === 'art_approved');
            const versions = events.map(e => e.payload.versionCount || 1);
            const stats = MathEngine.analyze(versions);
            
            return {
                versionsStats: stats,
                avgVersions: stats ? stats.mean.toFixed(1) : 'N/A'
            };
        }

        // 2.4 PREÇOS E CUSTOS
        getPriceInsights() {
            const events = this.db.events.filter(e => e.type === 'order_created' && e.payload.totalValue && e.payload.totalItems);
            const unitPrices = events.map(e => e.payload.totalValue / e.payload.totalItems);
            return MathEngine.analyze(unitPrices);
        }

        // 3. PREVISÕES (API PÚBLICA)
        predictDeadline(startDate = new Date()) {
            const timeData = this.getTimeInsights();
            const avgDays = timeData.production ? Math.ceil(timeData.production.mean) : 10; // Default 10 dias se sem dados
            // Adiciona margem de segurança (Desvio Padrão)
            const safeDays = timeData.production ? Math.ceil(timeData.production.mean + (timeData.production.stdDev || 0)) : 12;
            
            const estimatedDate = MathEngine.addBusinessDays(startDate, avgDays);
            const safeDate = MathEngine.addBusinessDays(startDate, safeDays);

            return {
                avgDays,
                safeDays,
                estimatedDate: estimatedDate.toISOString().split('T')[0],
                safeDate: safeDate.toISOString().split('T')[0],
                confidence: timeData.production ? timeData.production.confidence : 'Nenhuma'
            };
        }

        estimateMaterialNeed(fabricType, qtyPieces) {
            const insights = this.getMaterialInsights(fabricType);
            if (!insights.stats || insights.stats.mean === 0) return { error: "Sem dados históricos para este material." };
            
            const yieldPerKg = insights.stats.mean;
            const kgNeeded = qtyPieces / yieldPerKg;
            
            return {
                kgNeeded: kgNeeded.toFixed(2),
                yieldUsed: yieldPerKg.toFixed(2),
                confidence: insights.stats.confidence
            };
        }

        // 4. UI - PAINEL DE INTELIGÊNCIA
        openDashboard() {
            // Remove se já existir
            const existing = document.getElementById('hipocampo-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'hipocampo-modal';
            modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4';
            
            // Dados
            const matData = this.getMaterialInsights();
            const timeData = this.getTimeInsights();
            const artData = this.getArtInsights();
            const priceData = this.getPriceInsights();

            const renderStatCard = (title, stats, unit = '') => {
                if (!stats) return `<div class="bg-white/5 p-4 rounded border border-white/10"><h4 class="text-gray-400 text-sm"></h4><p class="text-gray-500">Dados insuficientes</p></div>`;
                const color = stats.confidence === 'Alta' ? 'text-green-400' : (stats.confidence === 'Média' ? 'text-yellow-400' : 'text-red-400');
                return `
                    <div class="bg-white/5 p-4 rounded border border-white/10 hover:border-cyan-500/50 transition-colors">
                        <div class="flex justify-between mb-2">
                            <h4 class="text-gray-300 font-bold text-sm"></h4>
                            <span class="text-xs border px-1 rounded  border-current">${stats.confidence}</span>
                        </div>
                        <div class="text-2xl font-bold text-white mb-1">${stats.mean.toFixed(1)} <span class="text-sm text-gray-400 font-normal"></span></div>
                        <div class="text-xs text-gray-500 flex justify-between">
                            <span>Amostras: ${stats.sampleSize}</span>
                            <span>Var: ±${stats.stdDev.toFixed(1)}</span>
                        </div>
                    </div>
                `;
            };

            modal.innerHTML = `
                <div class="bg-gray-900 w-full max-w-5xl h-[90vh] rounded-xl border border-white/10 flex flex-col shadow-2xl">
                    <!-- Header -->
                    <div class="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-xl">
                        <div class="flex items-center gap-3">
                            <span class="text-3xl">🧠</span>
                            <div>
                                <h2 class="text-xl font-bold text-white">Hipocampo IA</h2>
                                <p class="text-xs text-cyan-400">Núcleo de Inteligência e Memória</p>
                            </div>
                        </div>
                        <button id="close-hipocampo" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 overflow-y-auto p-6">
                        
                        <!-- Section: Produção & Tempo -->
                        <div class="mb-8">
                            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2"><svg class="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Tempos & Prazos</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                ${renderStatCard('Tempo de Produção (Dias Úteis)', timeData.production, 'dias')}
                                ${renderStatCard('Aprovação de Arte (Dias Úteis)', timeData.art, 'dias')}
                                ${renderStatCard('Versões de Arte até Aprovar', artData.versionsStats, 'versões')}
                            </div>
                        </div>

                        <!-- Section: Materiais -->
                        <div class="mb-8">
                            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2"><svg class="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg> Materiais & Rendimento</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                ${renderStatCard('Rendimento Geral', matData.stats, 'peças/kg')}
                                <!-- Placeholder para mais métricas futuras -->
                                <div class="bg-white/5 p-4 rounded border border-white/10 border-dashed flex items-center justify-center text-gray-600 text-sm">
                                    Mais dados necessários (Tinta, Papel)
                                </div>
                            </div>
                        </div>

                        <!-- Section: Financeiro -->
                        <div class="mb-8">
                            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2"><svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Financeiro</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                ${renderStatCard('Preço Médio Unitário', priceData, 'R$')}
                            </div>
                        </div>

                        <!-- Raw Data Log (Admin) -->
                        <div class="mt-8 pt-8 border-t border-white/10">
                            <h4 class="text-sm font-bold text-gray-500 mb-2">Log de Eventos Recentes</h4>
                            <div class="bg-black/30 rounded p-2 h-40 overflow-y-auto text-xs font-mono text-gray-400">
                                ${this.db.events.slice().reverse().slice(0, 50).map(e => 
                                    `<div><span class="text-cyan-600">[${e.type}]</span> ${new Date(e.meta.timestamp).toLocaleDateString()} - ${JSON.stringify(e.payload)}</div>`
                                ).join('')}
                            </div>
                            <div class="mt-2 flex gap-2">
                                <button id="hipo-export" class="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-white">Exportar Backup</button>
                                <button id="hipo-clear" class="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded">Limpar Memória</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Listeners do Modal
            document.getElementById('close-hipocampo').onclick = () => modal.remove();
            
            document.getElementById('hipo-export').onclick = () => {
                const blob = new Blob([JSON.stringify(this.db)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `hipocampo_backup_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
            };

            document.getElementById('hipo-clear').onclick = () => {
                if(confirm('ATENÇÃO: Isso apagará toda a inteligência aprendida. Continuar?')) {
                    this.db.events = [];
                    StorageAdapter.save(this.db);
                    modal.remove();
                    alert('Memória limpa.');
                }
            };
        }
    }

    // Instância Global
    window.HipocampoIA = new HipocampoCore();

})(window);
