"""Enhance Esmeraldas + Autos + Inversiones KBs with more FAQs and objections."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent

# ESMERALDAS - mas FAQs y objeciones
faqs_esmeraldas_extras = [
    {
        "pregunta": "Las esmeraldas son naturales o sinteticas?",
        "respuesta": "100% naturales certificadas. Todas nuestras esmeraldas vienen con certificado de autenticidad. No vendemos bisuteria ni esmeraldas sinteticas."
    },
    {
        "pregunta": "Ofrecen garantia?",
        "respuesta": "Si, garantia de por vida en autenticidad de la piedra. Si la pieza se daña (ej. broche aretes), tenemos taller propio para reparaciones."
    },
    {
        "pregunta": "Hacen envios?",
        "respuesta": "Si. Envios a todo Costa Rica via Correos de Costa Rica o couriers. Envios internacionales a USA, Mexico y resto LatAm coordinado por DHL."
    },
    {
        "pregunta": "Puedo ver las piezas en persona antes de comprar?",
        "respuesta": "Por supuesto. Tenemos showroom en CR donde puede ver y probar todas las piezas. Agendamos cita personalizada."
    },
    {
        "pregunta": "Aceptan tarjetas?",
        "respuesta": "Si. Aceptamos Visa, Mastercard, American Express, transferencia, SINPE Movil y efectivo. Para tarjetas, sin recargo en pago de contado."
    },
    {
        "pregunta": "Hacen piezas personalizadas?",
        "respuesta": "Si. Trabajamos con disenadores que pueden crear piezas a medida segun su idea. Tiempo de produccion: 2-4 semanas."
    },
    {
        "pregunta": "Cuanto duran las esmeraldas?",
        "respuesta": "Toda la vida. La esmeralda es una piedra preciosa duradera (dureza 7.5-8 en escala Mohs). Recomendamos limpieza profesional cada 1-2 anos para mantenerlas brillantes."
    },
    {
        "pregunta": "Tienen tienda online?",
        "respuesta": "Estamos en proceso de lanzar tienda online. Por ahora la mejor forma es DM o WhatsApp para mostrarle nuestras piezas con fotos y videos."
    }
]
objeciones_esmeraldas_extras = [
    {
        "objecion": "Esta muy caro / pense que era mas barato",
        "respuesta": "Entiendo. Vea, las esmeraldas naturales son piedras preciosas - el precio refleja la calidad de la piedra, el oro/plata, la mano de obra. Comparando con bisuteria: una bisuteria de 10,000 colones se daña en 6 meses, una esmeralda real es de por vida.",
        "cierre": "Le interesa ver opciones a partir de 30,000 CRC? Tenemos para todos los presupuestos."
    },
    {
        "objecion": "Como se que es esmeralda real?",
        "respuesta": "Excelente pregunta. Cada pieza viene con certificado gemmologico que valida origen, color y calidad de la piedra. Ademas tenemos garantia de autenticidad - si en cualquier momento un experto independiente certifica que no es real, le devolvemos su dinero."
    },
    {
        "objecion": "Lo voy a pensar",
        "respuesta": "Por supuesto. Es una decision importante. Le envio por WhatsApp las fotos + precios + certificacion para que la tenga a mano. Las esmeraldas no se devaluan, asi que cuando decida estamos aqui.",
        "cierre": "Hay alguna pieza en particular que le gusto mas?"
    }
]

# AUTOS - mas FAQs y objeciones
faqs_autos_extras = [
    {
        "pregunta": "Reciben mi auto en parte de pago?",
        "respuesta": "Si, evaluamos su vehiculo actual y aplicamos el valor como cuota inicial. Usamos referencias de mercado (Crautos, Encuentra24) para una valoracion justa. Tasamos sin compromiso."
    },
    {
        "pregunta": "Hacen financiamiento?",
        "respuesta": "Si. Trabajamos con varios bancos en CR. Cuota inicial desde 20%, plazos hasta 60 meses. Tasa segun perfil crediticio. Podemos pre-calificarlo en 24h."
    },
    {
        "pregunta": "El vehiculo tiene garantia?",
        "respuesta": "Si. Todos nuestros autos llevan revision mecanica completa antes de venta y damos garantia mecanica de 30-90 dias segun el vehiculo. Si algo falla, lo reparamos sin costo."
    },
    {
        "pregunta": "Pueden hacer todos los tramites?",
        "respuesta": "Si. Hacemos traspaso, Riteve, marchamo, todo. Le entregamos el auto listo para usar. Costo de tramites se cotiza aparte (generalmente 100k-200k CRC)."
    },
    {
        "pregunta": "El auto esta libre de gravamen?",
        "respuesta": "Si, todos nuestros vehiculos estan libres de gravamen, marchamos al dia, sin multas pendientes, sin reportes en INS. Le mostramos la consulta MTSS en vivo si lo desea."
    },
    {
        "pregunta": "Tienen autos hibridos o electricos?",
        "respuesta": "Si, segun disponibilidad. Tenemos Toyota Prius, Hyundai Ioniq, Kia Niro. Para electricos puros segun stock. Pregunte por el modelo que le interesa."
    },
    {
        "pregunta": "Que pasa si me arrepiento de la compra?",
        "respuesta": "Una vez firmado y traspasado el vehiculo, no hay devolucion. Pero antes de firmar, le damos test drive ilimitado, llevamos el auto a su mecanico de confianza si quiere, y respondemos cualquier duda. Asi se evita arrepentirse."
    },
    {
        "pregunta": "Dan acuerdo por los siguientes 5 anos del marchamo?",
        "respuesta": "El marchamo se cobra anual segun avaluo, no podemos prepagarlo. Pero le entregamos el auto con marchamo del ano vigente al dia. El proximo ano usted lo paga con valor de mercado normal."
    }
]
objeciones_autos_extras = [
    {
        "objecion": "El auto esta caro comparado con Crautos",
        "respuesta": "Entiendo. En Crautos hay autos a buen precio pero usted compra a desconocido, sin garantia, sin revision mecanica. Aqui paga un poco mas pero recibe: revision completa, garantia mecanica, tramites incluidos, financiamiento si necesita. Lo que se ahorra en problemas mecanicos justifica la diferencia.",
        "cierre": "Le interesa ver el listado de revision que pasamos a este vehiculo en particular?"
    },
    {
        "objecion": "Voy a ver mas opciones primero",
        "respuesta": "Perfecto, totalmente entendible. Una compra de auto no se hace en un dia. Le mando por WhatsApp las fotos + ficha + precio para que tenga la info cuando compare. Solo le pido una cosa: antes de decidir en otro lado, llameme. Igualamos cualquier oferta seria.",
        "cierre": "Le interesa que le agende otra prueba de manejo este sabado?"
    }
]

# INVERSIONES - mas FAQs
faqs_inversiones_extras = [
    {
        "pregunta": "Cual es la rentabilidad promedio de inversion inmobiliaria en CR?",
        "respuesta": "Depende del tipo. Renta tradicional: 5-7% anual neto. Airbnb en zonas turisticas: 8-15% anual. Flip (compra-remodela-vende): 15-30% en 6-12 meses. Plusvalia largo plazo: 5-10% anual. Nosotros analizamos cada opcion para usted."
    },
    {
        "pregunta": "Necesito ser residente para comprar propiedad?",
        "respuesta": "No. Extranjeros pueden comprar propiedad en CR con los mismos derechos que costarricenses. Solo se requiere DIMEX o pasaporte para tramites notariales."
    },
    {
        "pregunta": "Que impuestos pago al comprar?",
        "respuesta": "Impuesto de traspaso 1.5%, timbres notariales ~0.5%, honorarios abogado 1-1.5%, registro 0.5%. Total aprox 3.5-4% del valor de la propiedad. Le calculamos el costo total antes de comprar."
    },
    {
        "pregunta": "Cuanto tiempo tarda un proceso de compra?",
        "respuesta": "Si todo esta en orden: 30-45 dias desde oferta aceptada hasta escrituracion. Si hay financiamiento bancario, sumar 30 dias mas para approval. Compra cash es lo mas rapido."
    },
    {
        "pregunta": "Manejan propiedades en construccion (pre-venta)?",
        "respuesta": "Si. Hemos trabajado con varias desarrolladoras en CR. Pre-venta tiene ventajas (precio menor, eleccion de unidad) y riesgos (atraso de obra, cambios). Le explicamos los pros y contras de cada proyecto."
    },
    {
        "pregunta": "Pueden manejar el Airbnb por mi si compro?",
        "respuesta": "Trabajamos con partners de property management que pueden manejar la operacion Airbnb (limpieza, check-in, atencion huespedes). Comision tipica: 20-25% de los ingresos. Le presentamos opciones."
    },
    {
        "pregunta": "Cuanto cobra Inversiones Soler de honorarios?",
        "respuesta": "Para compra: 3% del valor de la propiedad. Para venta: 5% (incluye toda la promocion, fotos, agente, gestion). Para asesoria de inversion sin transaccion: consulta inicial gratuita, plan personalizado 200,000 CRC."
    }
]


# Aplicar enhancements
def append_unique(lst, items, key='pregunta'):
    """Agrega items a lista evitando duplicados por key."""
    existing = set(item.get(key, '') for item in lst)
    for it in items:
        if it.get(key, '') not in existing:
            lst.append(it)
    return lst


for kb_name, faqs_extras, obj_extras in [
    ('kb_esmeraldas', faqs_esmeraldas_extras, objeciones_esmeraldas_extras),
    ('kb_autos', faqs_autos_extras, objeciones_autos_extras),
    ('kb_inversiones', faqs_inversiones_extras, []),
]:
    p = ROOT / 'knowledge-bases' / f'{kb_name}.json'
    kb = json.loads(p.read_text(encoding='utf-8'))

    before_faq = len(kb.get('faq', []))
    before_obj = len(kb.get('objeciones', []))

    kb['faq'] = append_unique(kb.get('faq', []), faqs_extras, 'pregunta')
    if obj_extras:
        kb['objeciones'] = append_unique(kb.get('objeciones', []), obj_extras, 'objecion')

    # Bump version
    kb.setdefault('metadata', {})
    kb['metadata']['version'] = '2.0'
    kb['metadata']['enhanced_at'] = '2026-05-18'

    p.write_text(json.dumps(kb, indent=2, ensure_ascii=False), encoding='utf-8')

    after_faq = len(kb['faq'])
    after_obj = len(kb.get('objeciones', []))
    print(f'{kb_name}: faq {before_faq}->{after_faq} (+{after_faq-before_faq}), objeciones {before_obj}->{after_obj} (+{after_obj-before_obj})')

print('\nKBs actualizadas. Reload pendiente.')
