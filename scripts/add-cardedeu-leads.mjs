/**
 * Adds Cardedeu businesses to the all-businesses.json Pipedream file.
 * Parses URL slugs into business names, skips generic emails (info@csetc.cat),
 * and appends with proper email content.
 *
 * Usage:
 *   node scripts/add-cardedeu-leads.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOWN = "Cardedeu";
const CITY_SLUG = "cardedeu";
const REGION = "Vallès Oriental";

/** Skip generic/placeholder emails */
const SKIP_EMAILS = ["info@csetc.cat"];

/** Raw data: URL \t Email */
const RAW_DATA = `https://directori.csetc.cat/item/5-gr-o-mes/	5gramsomes@gmail.com
https://directori.csetc.cat/item/al-bari-peixateria/	elisabetalvarez81@gmail.com
https://directori.csetc.cat/item/anna-fruits-cardedeu/	info@csetc.cat
https://directori.csetc.cat/item/antonio-mayo-agusti/	reginaiberic@hotmail.com
https://directori.csetc.cat/item/assolim-alimentaria/	xavier.castellvi@assolim.com
https://directori.csetc.cat/item/bodega-baco/	fesmarats61@gmail.com
https://directori.csetc.cat/item/bon-area/	info@csetc.cat
https://directori.csetc.cat/item/ca-la-teresina/	calateresina63@gmail.com
https://directori.csetc.cat/item/cardedeu-supermercat/	info@csetc.cat
https://directori.csetc.cat/item/carnisseria-julia/	davidjulianat@gmail.com
https://directori.csetc.cat/item/carrefour-market/	dolores_ortiz_serrano@carrefour.com
https://directori.csetc.cat/item/cervesa-sant-jordi/	info@cervesasantjordi.cat
https://directori.csetc.cat/item/clos-codina/	closcodina@gmail.com
https://directori.csetc.cat/item/coaliment-poble-sec/	coalimentpoblesec@gmail.com
https://directori.csetc.cat/item/comercial-restoda/	comercial@restoda.es
https://directori.csetc.cat/item/consum/	info@csetc.cat
https://directori.csetc.cat/item/cuina-oberta/	cuinaoberta@hotmail.es
https://directori.csetc.cat/item/de-la-granja-a-taula/	info@delagranjaataula.com
https://directori.csetc.cat/item/dietetica-natural/	salviaflor@hotmail.com
https://directori.csetc.cat/item/diets-house/	info@csetc.cat
https://directori.csetc.cat/item/aplicard/	nuria@aplicard.com
https://directori.csetc.cat/item/graficas-llinars/	info@csetc.cat
https://directori.csetc.cat/item/impress-diseno-iberica/	spain@impress.biz
https://directori.csetc.cat/item/ivan-bosch-il%c2%b7lustracions/	info@csetc.cat
https://directori.csetc.cat/item/kokopelli-bcn/	info@kokopellibcn.com
https://directori.csetc.cat/item/cdu-multiserveis/	cdumultiserveis@hotmail.com
https://directori.csetc.cat/item/escuela-de-wing-chun-kung-fu/	info@csetc.cat
https://directori.csetc.cat/item/viver-de-bell-lloc/	vivelloc@vivelloc.cat
https://directori.csetc.cat/item/accessoris-servei-2/	comercial@servei2.com
https://directori.csetc.cat/item/auto-cardedeu-michelin/	autocardedeu@hotmail.com
https://directori.csetc.cat/item/autoso-servei-2/	comercial@servei2.com
https://directori.csetc.cat/item/avintia/	team@avintiaracing.com
https://directori.csetc.cat/item/benzinera-bp/	joan.cmitjorn@gmail.com
https://directori.csetc.cat/item/benzinera-meroil/	info@csetc.cat
https://directori.csetc.cat/item/driver-cars-bcn/	drivercars@drivercarsbcn.com
https://directori.csetc.cat/item/gasch-auto-detail-center/	oscar_gasch@hotmail.com
https://directori.csetc.cat/item/karting-cardedeu/	info@kartingcardedeu.com
https://directori.csetc.cat/item/planxisteria-girbau/	info@planxisteria-girbau.com
https://directori.csetc.cat/item/repsol/	info@csetc.cat
https://directori.csetc.cat/item/servei-1-servei-3/	info@isantscp.cat
https://directori.csetc.cat/item/taller-la-roca/	tallerlaroca@gmail.com
https://directori.csetc.cat/item/tallers-miquel-la-roca/	info@csetc.cat
https://directori.csetc.cat/item/ad-marina-automocio/	cr@admarina.com
https://directori.csetc.cat/item/agora/	agora.cardedeu@gmail.com
https://directori.csetc.cat/item/aloges/	dorota@aloges.cat
https://directori.csetc.cat/item/alsi-il%c2%b7luminacio/	alsi-iluminacio@ya.com
https://directori.csetc.cat/item/anuska/	hola.anuska@gmail.com
https://directori.csetc.cat/item/arcom-cardedeu/	arcom.cardedeu@hotmail.com
https://directori.csetc.cat/item/artijoc/	botiga@artijoc.com
https://directori.csetc.cat/item/artimarc/	artimarc.cardedeu@gmail.com
https://directori.csetc.cat/item/badallibres/	badallibres@badallibres.cat
https://directori.csetc.cat/item/basar-oriental/	info@csetc.cat
https://directori.csetc.cat/item/botanic-cardedeu/	jardicardedeu@gmail.com
https://directori.csetc.cat/item/bric-mobel/	bricmobel@hotmail.com
https://directori.csetc.cat/item/bricotech/	info@bricotechonline.com
https://directori.csetc.cat/item/c-casa/	hanqianzhou@qq.com
https://directori.csetc.cat/item/cat-music/	catmusic@catmusic.es
https://directori.csetc.cat/item/cavaletti/	info@cavaletti.cat
https://directori.csetc.cat/item/centre-optic-cardedeu/	avinguda17@gmail.com
https://directori.csetc.cat/item/cicles-ruaix/	ciclesruaix@hotmail.com
https://directori.csetc.cat/item/clarel/	info@csetc.cat
https://directori.csetc.cat/item/corderch-material-doficina-i-papereria/	botiga@ofimatcoderch.com
https://directori.csetc.cat/item/360o-shop/	monica.perales@hotmail.com
https://directori.csetc.cat/item/aca-guevara/	info@csetc.cat
https://directori.csetc.cat/item/arquer-europe/	info@arquer.es
https://directori.csetc.cat/item/boroburur/	riquelmearanda@hotmail.com
https://directori.csetc.cat/item/calcats-carles-canovas/	sabateriacarlescanovas@gmail.com
https://directori.csetc.cat/item/cmc/	cmc@artifecs.com
https://directori.csetc.cat/item/dual-moda/	ddual.dual@gmail.com
https://directori.csetc.cat/item/el-calaixet/	cristina.diaz.pena@gmail.com
https://directori.csetc.cat/item/el-somni/	elsomni.cardedeu@gmail.com
https://directori.csetc.cat/item/esports-10/	esports10@esports10.cat
https://directori.csetc.cat/item/estreno/	paulahierrogaza@gmail.com
https://directori.csetc.cat/item/lluisa-calcats/	lluisasabateries@hotmail.com
https://directori.csetc.cat/item/lluisa-calcats-2/	lluisasabateries@hotmail.com
https://directori.csetc.cat/item/mimat/	mimat.cardedeu@gmail.com
https://directori.csetc.cat/item/moda-lendyn-complements/	info@csetc.cat
https://directori.csetc.cat/item/olivia/	oliviabarcelona.2012@gmail.com
https://directori.csetc.cat/item/palma/	palmacardedeu@gmail.com
https://directori.csetc.cat/item/pepa-terron/	pepaterron@outlook.com
https://directori.csetc.cat/item/peu-xic/	peuxic@terra.com
https://directori.csetc.cat/item/regina/	info@csetc.cat
https://directori.csetc.cat/item/aura-spring-bcn/	info@csetc.cat
https://directori.csetc.cat/item/b-15-imatge-corporativa/	b15@b15.es
https://directori.csetc.cat/item/criteri-de-comunicacio/	info@criteri.net
https://directori.csetc.cat/item/introversion/	info@comunicasottovoce.com
https://directori.csetc.cat/item/canalum/	catalunya@canalum.net
https://directori.csetc.cat/item/construcciones-francisco-hinojosa-rosales/	info@csetc.cat
https://directori.csetc.cat/item/decopal/	info@csetc.cat
https://directori.csetc.cat/item/deumal/	deumal@deumal.com
https://directori.csetc.cat/item/deumal-magatzem/	deumal@deumal.com
https://directori.csetc.cat/item/funcasta/	info@funcasta.com
https://directori.csetc.cat/item/gutter-system/	alberto.villaluenga@guttersystem.es
https://directori.csetc.cat/item/iniciatives-i-construccions-can-brunet/	iccanbrunetsl@gmail.com
https://directori.csetc.cat/item/magatzem-forns/	info@csetc.cat
https://directori.csetc.cat/item/maneig-piscines/	info@maneig.com
https://directori.csetc.cat/item/marbres-cardedeu/	gerard.alejandro@hotmail.com
https://directori.csetc.cat/item/marbres-leno/	info@csetc.cat
https://directori.csetc.cat/item/novanau/	novanausl@novanausl.com
https://directori.csetc.cat/item/piscines-carde10/	info@piscinescarde10.com
https://directori.csetc.cat/item/prycsa/	prycsa@prycsa.com
https://directori.csetc.cat/item/resifloor/	info@resifloor.com
https://directori.csetc.cat/item/washington-internacional/	del.valles@wash-int.com
https://directori.csetc.cat/item/academia-ateneu/	academia.ateneu@gmail.com
https://directori.csetc.cat/item/aula-creativa-el-raco-de-lalumne/	elracodelalumne@aulacreativa.cat
https://directori.csetc.cat/item/autoescola-sant-celoni/	cardedeu@autoescolasantceloni.net
https://directori.csetc.cat/item/autoescoles-cardedeu/	aecardedeu@gmail.com
https://directori.csetc.cat/item/autoescoles-mollet/	info@autoescolesmollet.com
https://directori.csetc.cat/item/balls-de-salo-josep-i-carme/	info@csetc.cat
https://directori.csetc.cat/item/bugui-bugui/	parcinfantilbugui@hotmail.com
https://directori.csetc.cat/item/cambridge-school/	cardedeu@cambridgeschool.com
https://directori.csetc.cat/item/can-canturri/	cancanturri.cardedeu@gmail.com
https://directori.csetc.cat/item/chaplins-school/	cardedeu@chaplins.org
https://directori.csetc.cat/item/english-co/	havefun@englishandco.net
https://directori.csetc.cat/item/escola-bressol-petits-artistes/	rosa@petitsartistes.com
https://directori.csetc.cat/item/escola-de-comics-boix-studio/	info@csetc.cat
https://directori.csetc.cat/item/escola-de-dansa-vane-fernandez/	edvanefernandez@hotmail.com
https://directori.csetc.cat/item/espai-totsona/	totsona@totsona.com
https://directori.csetc.cat/item/espai-vital-de-moviment-i-dansa/	info@csetc.cat
https://directori.csetc.cat/item/guarderi-tipis/	mail@guarderia-tipis.com
https://directori.csetc.cat/item/ivan-boch-il%c2%b7lustracions/	info@csetc.cat
https://directori.csetc.cat/item/kidsus-head-languages-services/	info@headlanguages.com
https://directori.csetc.cat/item/lazul/	azulmartapolo@gmail.com
https://directori.csetc.cat/item/barcelona-semiconductors-s-l/	bcnsem@bcnsem.com
https://directori.csetc.cat/item/bloque-8/	info@bloque8.com
https://directori.csetc.cat/item/bover/	info@bover.es
https://directori.csetc.cat/item/cordrich/	administracion@cordrich.com
https://directori.csetc.cat/item/daniel-ruiz-valero/	daniruva@gmail.com
https://directori.csetc.cat/item/decorluc-ner-99/	info@csetc.cat
https://directori.csetc.cat/item/dimatic/	dimatic@dimatic.es
https://directori.csetc.cat/item/diteico/	info@diteico.com
https://directori.csetc.cat/item/fenoplastica/	fenoplastica@fenoplastica.com
https://directori.csetc.cat/item/gaco-electric/	gacoelectric@gacoelectric.com
https://directori.csetc.cat/item/jj-bcn-internacional/	info@jjbcn.com
https://directori.csetc.cat/item/tecnotrafo/	conta@tecnotrafo.es
https://directori.csetc.cat/item/brau-estudi-fotografic/	info@gabrielbrau.com
https://directori.csetc.cat/item/mari-lozano-fotografia/	marilozanofotografia@gmail.com
https://directori.csetc.cat/item/deixalleria-comarcal/	info@csetc.cat
https://directori.csetc.cat/item/savosa/	serveisambientals@savosa.cat
https://directori.csetc.cat/item/100setze/	info@100setze.com
https://directori.csetc.cat/item/alfou-doner-kebab/	nasirtik@gmail.com
https://directori.csetc.cat/item/bar-abierto/	info@csetc.cat
https://directori.csetc.cat/item/bar-barbopas/	barbopas130@hotmail.com
https://directori.csetc.cat/item/bar-ca-la-iaia/	info@csetc.cat
https://directori.csetc.cat/item/bar-cafeteria-m-m/	acinom073@hotmail.com
https://directori.csetc.cat/item/bar-cafeteria-quatre-elements/	quatreelements@hotmail.es
https://directori.csetc.cat/item/bar-canver/	info@csetc.cat
https://directori.csetc.cat/item/bar-del-mercat-municipal/	santadepaulasierra@gmail.com
https://directori.csetc.cat/item/bar-guadiana/	info@csetc.cat
https://directori.csetc.cat/item/bar-lalzina/	info@csetc.cat
https://directori.csetc.cat/item/bar-los-simsons/	rafalulu@hotmail.com
https://directori.csetc.cat/item/bar-restaurant-ca-la-carmeta/	calacarmeta@hotmail.com
https://directori.csetc.cat/item/bar-restaurant-can-suay/	restaurantcansuay@gmail.com
https://directori.csetc.cat/item/bar-restaurant-com-a-casa/	zuly00@hotmail.es
https://directori.csetc.cat/item/bar-xic/	josuconj@gmail.com
https://directori.csetc.cat/item/ca-lagusti/	vicentetalaveramartinez23@gmail.com
https://directori.csetc.cat/item/cafe-central/	cafecentral1999@hotmail.com
https://directori.csetc.cat/item/cafeteria-blanc-i-negre/	jesusborro@hotmail.com
https://directori.csetc.cat/item/cafeteria-el-secret/	sebascv@gmail.com
https://directori.csetc.cat/item/afisa/	afisa@fincasafisa.es
https://directori.csetc.cat/item/ambit-gestio-patrimonial/	recepcio@caviambit.cat
https://directori.csetc.cat/item/finques-el-sui/	info@habitatgeselsui.com
https://directori.csetc.cat/item/finques-immo-10/	merce@immo10.es
https://directori.csetc.cat/item/nivell/	nivell@nivell.net
https://directori.csetc.cat/item/picsa/	picsa@picsa.cat
https://directori.csetc.cat/item/residencial-standing-home-s-l/	info@csetc.cat
https://directori.csetc.cat/item/riergal/	joan@riergal.com
https://directori.csetc.cat/item/dgtic-s-c-p/	info@dgtic.com
https://directori.csetc.cat/item/agerba/	agerba@agerba.com
https://directori.csetc.cat/item/armaduch/	info@csetc.cat
https://directori.csetc.cat/item/campos-facanes-i-finestres/	camposfachadas@terra.com
https://directori.csetc.cat/item/carpinteria-metal%c2%b7lica-tomas-rico/	aluminisrico@yahoo.es
https://directori.csetc.cat/item/carpinteria-pais-torrell/	info@csetc.cat
https://directori.csetc.cat/item/cld-corp/	info@corpcld.com
https://directori.csetc.cat/item/construcciones-busnaque/	busnaque@busnaque.com
https://directori.csetc.cat/item/construccions-safont/	francesc@comunicaciocreativa.com
https://directori.csetc.cat/item/decoris-interiorisme/	ddecoris@gmail.com
https://directori.csetc.cat/item/dissint/	immasafont@gmail.com
https://directori.csetc.cat/item/electrica-fortuny/	esteve@electricafortuny.com
https://directori.csetc.cat/item/electronica-ciudad/	info@electronicaciudad.com
https://directori.csetc.cat/item/electronica-saboya/	info@elecsaboya.com
https://directori.csetc.cat/item/elicsia-singular/	info@elicsia.com
https://directori.csetc.cat/item/espai-dedoca/	espaidedoca@gmail.com
https://directori.csetc.cat/item/instal%c2%b7lacions-david-company/	info@csetc.cat
https://directori.csetc.cat/item/magatzems-sant-antoni/	josep.mariateresa@gmail.com
https://directori.csetc.cat/item/marbres-bertran/	marbres.bertran@hotmail.com
https://directori.csetc.cat/item/miguel-fortuny-llibre/	fortunymiquel@hotmail.com
https://directori.csetc.cat/item/oruga-robots/	info@orugarobots.com
https://directori.csetc.cat/item/village-grow/	support@juanashop.com
https://directori.csetc.cat/item/vivers-bosch/	info@aboschl.com
https://directori.csetc.cat/item/asea-brown-boberi/	mariaangels.rangil@es.abb.com
https://directori.csetc.cat/item/bionets/	bionets@telefonica.net
https://directori.csetc.cat/item/dia-sant-antoni/	info@csetc.cat
https://directori.csetc.cat/item/gumer-sport/	info@csetc.cat
https://directori.csetc.cat/item/magatzem-manas/	info@csetc.cat
https://directori.csetc.cat/item/magatzems-cardedeu/	magatzemscardedeu@hotmail.com
https://directori.csetc.cat/item/sould-park/	info@souldpark.com
https://directori.csetc.cat/item/stocks-industria/	info@stocksindustria.com
https://directori.csetc.cat/item/stocks-tienda/	info@stockstienda.com
https://directori.csetc.cat/item/antoni-fortuny/	antoni@afortuny.com
https://directori.csetc.cat/item/aplec-attec-espana/	aplec@aplecgroup.com
https://directori.csetc.cat/item/asetec/	info@asetec-soldi.com
https://directori.csetc.cat/item/control-ing/	sales@control-ing.com
https://directori.csetc.cat/item/danmix/	daniel@danmix.es
https://directori.csetc.cat/item/dpis-suministros-digitales/	comercial@dpis.es
https://directori.csetc.cat/item/j-c-puig-maltas/	info@csetc.cat
https://directori.csetc.cat/item/mecanica/	garme@garme.cat
https://directori.csetc.cat/item/mecaniques-balmes/	info@mecaniquesbalmes.es
https://directori.csetc.cat/item/mecanitzats-al-gar-cardedeu/	mecanitzats@al-gar.com
https://directori.csetc.cat/item/montajes-industriales-guicar/	guicarsl@yahoo.es
https://directori.csetc.cat/item/pintuc/	pintuc@pintuccompresores.com
https://directori.csetc.cat/item/puig-excavacions/	puig@puigexcavacions.com
https://directori.csetc.cat/item/seinec/	seinec@seinec.com
https://directori.csetc.cat/item/stampa-digital/	comercial@dpis.es
https://directori.csetc.cat/item/taller-xurreries-ambulants/	info@csetc.cat
https://directori.csetc.cat/item/talleres-daumar/	info@csetc.cat
https://directori.csetc.cat/item/talleres-estrany/	jordi@talleresestrany.com
https://directori.csetc.cat/item/terp/	info@matachana.com
https://directori.csetc.cat/item/vyp/	info@vypsl.es
https://directori.csetc.cat/item/aluminios-cricar/	aluminioscricar@gmail.com
https://directori.csetc.cat/item/aluminis-climavent/	climavent@hotmail.com
https://directori.csetc.cat/item/aluminis-i-vidres-cardedeu/	aluvicardedeu@hotmail.es
https://directori.csetc.cat/item/apm/	os.tecnica@apm-moldes.com
https://directori.csetc.cat/item/avixandri/	avixandri@gmail.com
https://directori.csetc.cat/item/bisan/	joan@bisansl.com
https://directori.csetc.cat/item/comas-partners/	comaspartners@comaspartners.com
https://directori.csetc.cat/item/construcciones-de-moldes-cardedeu/	cmcardedeu@cmcplastics.net
https://directori.csetc.cat/item/construcciones-mecanicas-lozano/	cmlozano@hotmail.com
https://directori.csetc.cat/item/ejes/	info@csetc.cat
https://directori.csetc.cat/item/ferros-reverter/	ferrosreverter@gmail.com
https://directori.csetc.cat/item/induka/	info@induka.es
https://directori.csetc.cat/item/llamada/	llamada@cm-llamada.es
https://directori.csetc.cat/item/metrikal/	metrikal@metrikal.com
https://directori.csetc.cat/item/montserrat-caballero-fabregat/	info@csetc.cat
https://directori.csetc.cat/item/montserrat-fabregat/	info@csetc.cat
https://directori.csetc.cat/item/persitot/	persitot@persitot.com
https://directori.csetc.cat/item/pjc-precisio/	info@csetc.cat
https://directori.csetc.cat/item/recoper-2000/	info@csetc.cat
https://directori.csetc.cat/item/seoper/	info@csetc.cat
https://directori.csetc.cat/item/asm/	asm.735@asmred.es
https://directori.csetc.cat/item/gestilen/	emartinez@gestilen.com
https://directori.csetc.cat/item/indapak/	andreu@indapak.com
https://directori.csetc.cat/item/j-cano/	raulsola@jcano.es
https://directori.csetc.cat/item/jomarc-logistic-valles/	comercial@jomarclogistic.com
https://directori.csetc.cat/item/negot-trafic/	s.ejarque@negottrafic.com
https://directori.csetc.cat/item/reciclatges-josep-maria-valls/	info@reciclatgesvalls.com
https://directori.csetc.cat/item/transports-r-prades/	info@csetc.cat
https://directori.csetc.cat/item/barnizados-y-lacados-serrano/	barnizadosserrano@hotmail.com
https://directori.csetc.cat/item/kibuc/	marmundi@kibuc.com
https://directori.csetc.cat/item/mobles-sercuina/	sercuina@gmail.com
https://directori.csetc.cat/item/pefran/	rodisamoble@gmail.com
https://directori.csetc.cat/item/sampayo/	info@sampayo-interiorisme.com
https://directori.csetc.cat/item/santa-cole/	info@santacole.com
https://directori.csetc.cat/item/unidad-practica/	unidadpractica@unidadpractica.com
https://directori.csetc.cat/item/demco/	info@demco.es
https://directori.csetc.cat/item/edihor/	info@demco.es
https://directori.csetc.cat/item/fast-flute/	info@fastflute.com
https://directori.csetc.cat/item/protect-pack/	info@protectpackat.com
https://directori.csetc.cat/item/tot-tall/	m.tottall@gmail.com
https://directori.csetc.cat/item/alfiba-detergents/	alfiba@alfiba.com
https://directori.csetc.cat/item/esquim/	esquim@esquim.com
https://directori.csetc.cat/item/plastics-cardedeu/	cmcardedeu@cmcplastics.net
https://directori.csetc.cat/item/plastics-castells/	plastics.castells@gmail.com
https://directori.csetc.cat/item/plastics-cora/	info@csetc.cat
https://directori.csetc.cat/item/prolutec/	info@prolutec.es
https://directori.csetc.cat/item/quermany-connect/	quermany@gmail.com
https://directori.csetc.cat/item/vdf-team/	administracion@vdf.es
https://directori.csetc.cat/item/zeller/	info@csetc.cat
https://directori.csetc.cat/item/banc-de-sabadell/	info@csetc.cat
https://directori.csetc.cat/item/banco-popular-espanoll/	00750298@bancopopular.es
https://directori.csetc.cat/item/banco-santander/	elsantos@gruposantander.es
https://directori.csetc.cat/item/bbva/	mvmorcillo@bbva.com
https://directori.csetc.cat/item/bbva-2/	info@csetc.cat
https://directori.csetc.cat/item/bbva-3/	info@csetc.cat
https://directori.csetc.cat/item/catalunya-banc-sa/	empleats-oficina.0652@catalunyacaixa.com
https://directori.csetc.cat/item/de-haro-assegurances/	deharoassegurances@yahoo.es
https://directori.csetc.cat/item/la-caixa/	info@csetc.cat
https://directori.csetc.cat/item/la-caixa-2/	info@csetc.cat
https://directori.csetc.cat/item/la-caixa-3/	4968@lacaixa.es
https://directori.csetc.cat/item/mutual-de-conductors/	info@csetc.cat
https://directori.csetc.cat/item/racc/	ricardo.cabiscol@cc.racc.es
https://directori.csetc.cat/item/sole-saez-assegurances/	cgs@hotmail.com
https://directori.csetc.cat/item/psittacus-catalonia/	info@psittacus.com
https://directori.csetc.cat/item/simcos/	info@terrasimcos.com
https://directori.csetc.cat/item/sirocco/	sirocco@sirocco.es
https://directori.csetc.cat/item/terranova-2/	terranova2@dewandas.com
https://directori.csetc.cat/item/assegurances-catalana-occidente/	f.jurado@agentes.catalanaoccidente.com
https://directori.csetc.cat/item/assessoria-corbella/	finques@qam.es
https://directori.csetc.cat/item/assessoria-lancina-carcelle/	info@csetc.cat
https://directori.csetc.cat/item/assessors-gamma/	info@assessoriagamma.com
https://directori.csetc.cat/item/autoelectric-torras/	torrasprat@gmail.com
https://directori.csetc.cat/item/buiza-motors/	buizamotors@gmail.com
https://directori.csetc.cat/item/canovas-comunicacio-creativa/	raquel@comunicaciocreativa.com
https://directori.csetc.cat/item/cardedeu-advocats/	cardedeuadvocats@gmail.com
https://directori.csetc.cat/item/cardedeu-legal-advocats/	consultoria@cardedeulegal.cat
https://directori.csetc.cat/item/cat-aigua/	info@cataigua.com
https://directori.csetc.cat/item/coll-gestoria/	cardedeu@gestoriacoll.com
https://directori.csetc.cat/item/consulting-cardedeu-s-l/	assessoria@consultingcardedeu.cat
https://directori.csetc.cat/item/controlsui/	controlsui@controlsui.cat
https://directori.csetc.cat/item/cronique-esport/	cronique@cronique.com
https://directori.csetc.cat/item/delta/	info@csetc.cat
https://directori.csetc.cat/item/despatx-segarra-i-olive/	segarraolive@icab.cat
https://directori.csetc.cat/item/el-local/	ellocalestudi@gmail.com
https://directori.csetc.cat/item/el-nas-de-cardedeu/	ullalull@gmail.com
https://directori.csetc.cat/item/espai27b-darquitectura/	myrna@coac.net
https://directori.csetc.cat/item/espinola-consultors/	info@espinola.es
https://directori.csetc.cat/item/4-puntades/	mase.4puntades@gmail.com
https://directori.csetc.cat/item/aida-anglada/	angladaestetica@gmail.com
https://directori.csetc.cat/item/ambar/	info@csetc.cat
https://directori.csetc.cat/item/argent-estilistes/	argent@estilistes.com
https://directori.csetc.cat/item/arima-centre-de-terapies/	angels67@telefonica.net
https://directori.csetc.cat/item/camaguey-atencio-turistica/	camaguey.at@gmail.com
https://directori.csetc.cat/item/barberia-loli/	lolimarin1323@gmail.com
https://directori.csetc.cat/item/bdepil/	cardedeu@bdepil.es
https://directori.csetc.cat/item/centre-destetica-elvira/	info@csetc.cat
https://directori.csetc.cat/item/centre-destetica-i-terapies-naturals/	manuela_275@hotmail.com
https://directori.csetc.cat/item/centre-destetica-marta-borras/	floreta21@hotmail.com
https://directori.csetc.cat/item/centre-sana/	info@csetc.cat
https://directori.csetc.cat/item/centre-termal/	info@csetc.cat
https://directori.csetc.cat/item/cosit-rapid/	info@csetc.cat
https://directori.csetc.cat/item/costura/	carmen.costuracardedeu@gmail.com
https://directori.csetc.cat/item/di-and-si/	diandsi@hotmail.es
https://directori.csetc.cat/item/e-puig-perruqueria/	e.puig2012@gmail.com
https://directori.csetc.cat/item/eloisa/	info@csetc.cat
https://directori.csetc.cat/item/enriqueta-sola/	esq16@hotmail.com
https://directori.csetc.cat/item/espai-connecta-cardedeu/	espaiconnecta@gmail.com
https://directori.csetc.cat/item/amics-peluts/	amicspeluts@gmail.com
https://directori.csetc.cat/item/centre-medic-cardedeu/	info@csetc.cat
https://directori.csetc.cat/item/centre-medic-dr-klein/	info@doctor-klein.net
https://directori.csetc.cat/item/centre-podologic-cardedeu/	fugarolas.podologia@hotmail.com
https://directori.csetc.cat/item/ciro-de-alaminos-clinica-veterinaria/	cvcardedeu@yahoo.es
https://directori.csetc.cat/item/clinica-dental-cardedeu/	clinicadentalcardedeu@clinicadentalcardedeu.es
https://directori.csetc.cat/item/clinica-dental-dr-lozano/	luislozano39@hotmail.com
https://directori.csetc.cat/item/clinica-dental-longo/	emilce.longo@gmail.com
https://directori.csetc.cat/item/clinica-dental-olivas-nevado/	info@csetc.cat
https://directori.csetc.cat/item/clinica-dental-poble-sec/	poblesec.dental@gmail.com
https://directori.csetc.cat/item/clinica-dental-rosello-i-camps/	mcamps.riu@gmail.com
https://directori.csetc.cat/item/clinica-lilla-veterinaria/	illa_veterinaria@hotmail.com
https://directori.csetc.cat/item/clinicas-gabident/	moglar.clinicadental@gmail.com
https://directori.csetc.cat/item/dent-vital/	dentvital@hotmail.com
https://directori.csetc.cat/item/eudog-consultori/	xavi@eudog.es
https://directori.csetc.cat/item/hospital-veterinari-de-cardedeu/	anabelhvc@gmail.com
https://directori.csetc.cat/item/sonia-veterinaria/	soniaveterinaria@gmail.com
https://directori.csetc.cat/item/dactili-dex/	belen@dactilix.com
https://directori.csetc.cat/item/dismarina/	info@dismarina.com
https://directori.csetc.cat/item/estampados-sanmar/	maria@estampadossanmar.com
https://directori.csetc.cat/item/industrial-stamp/	puntiblond@puntiblond.com
https://directori.csetc.cat/item/lola-casademunt/	info@lolacasademunt.es
https://directori.csetc.cat/item/normatex/	normatex@normatex.es
https://directori.csetc.cat/item/persentili/	persentili@persentili.es
https://directori.csetc.cat/item/preformados-k-28/	pfdk28@terra.es
https://directori.csetc.cat/item/puntiblond/	info@puntiblond.com
https://directori.csetc.cat/item/sefar-maissa/	info.maissa@sefar.com
https://directori.csetc.cat/item/tejidos-de-punto-zarco/	info@csetc.cat
https://directori.csetc.cat/item/textil-carbor/	belen@dactilix.com`;

/**
 * Convert URL slug to business name.
 * "bar-restaurant-ca-la-carmeta" → "Bar Restaurant Ca La Carmeta"
 */
function slugToName(slug) {
  return decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bI\b/g, "i")   // "i" should stay lowercase in Catalan
    .replace(/\bDe\b/g, "de")
    .replace(/\bDel\b/g, "del")
    .replace(/\bDels\b/g, "dels")
    .replace(/\bD\b/g, "d'")
    .replace(/\bLa\b/g, "la")
    .replace(/\bEl\b/g, "el")
    .replace(/\bEls\b/g, "els")
    .replace(/\bLes\b/g, "les")
    .replace(/\bL\b/g, "l'")
    .trim();
  // Capitalize first letter always
}

function getEmailBody(name, town, citySlug) {
  return `<p>Hola,</p>

<p>Sóc l'Albert, d'<strong>esdeveniments.cat</strong>.</p>

<p>Cada setmana milers de persones busquen on menjar, què comprar i què fer a <strong>${town}</strong> al nostre portal.</p>

<p>Estem obrint un espai de publicitat local — un banner senzill que apareix quan algú consulta els esdeveniments del vostre poble. Visible per qui ja té la intenció de sortir.</p>

<p>Podeu veure-ho aquí: <a href="https://esdeveniments.cat/${citySlug}">esdeveniments.cat/${citySlug}</a></p>

<p>Si us interessa, responeu aquest correu i us explico condicions. Sense compromís.</p>

<p>Salut,</p>

<p style="margin-top:24px;border-top:1px solid #eee;padding-top:12px;font-size:13px;color:#666;">
Albert Olivé<br>
<a href="https://esdeveniments.cat">esdeveniments.cat</a><br>
<a href="mailto:hola@esdeveniments.cat">hola@esdeveniments.cat</a>
</p>`;
}

function main() {
  // Load existing all-businesses.json
  const jsonPath = path.join(__dirname, "output", "pipedream", "all-businesses.json");
  const existing = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const existingCount = Object.keys(existing).length;
  const existingEmails = new Set(
    Object.values(existing).map((e) => e.email.toLowerCase()),
  );

  console.log(`📥 Existing: ${existingCount} entries`);

  // Parse Cardedeu data
  const lines = RAW_DATA.split("\n").filter((l) => l.trim());
  let added = 0;
  let skipped = 0;
  let duplicate = 0;
  let nextIndex = existingCount;

  for (const line of lines) {
    const [url, email] = line.split("\t").map((s) => s.trim());
    if (!url || !email) continue;

    // Skip generic emails
    if (SKIP_EMAILS.includes(email.toLowerCase())) {
      skipped++;
      continue;
    }

    // Skip duplicates
    if (existingEmails.has(email.toLowerCase())) {
      duplicate++;
      continue;
    }

    // Extract slug from URL
    const slug = url
      .replace(/^https?:\/\/directori\.csetc\.cat\/item\//, "")
      .replace(/\/$/, "");

    let name = slugToName(slug);
    // Ensure first char is uppercase
    name = name.charAt(0).toUpperCase() + name.slice(1);

    existing[String(nextIndex)] = {
      email: email.toLowerCase(),
      town: TOWN,
      citySlug: CITY_SLUG,
    };

    existingEmails.add(email.toLowerCase());
    nextIndex++;
    added++;
  }

  // Write back
  fs.writeFileSync(jsonPath, JSON.stringify(existing, null, 2), "utf-8");

  console.log(`\n📊 Cardedeu:`);
  console.log(`   Parsed:     ${lines.length} entries`);
  console.log(`   Added:      ${added}`);
  console.log(`   Skipped (generic email): ${skipped}`);
  console.log(`   Duplicate:  ${duplicate}`);
  console.log(`\n📦 Total: ${nextIndex} entries in all-businesses.json`);

  // Show sample emails
  const sampleEmails = Object.values(existing)
    .map((e) => e.email)
    .slice(-5);
  console.log(`\n📧 Sample Cardedeu emails:`);
  for (const email of sampleEmails) {
    console.log(`   ${email}`);
  }
}

main();
