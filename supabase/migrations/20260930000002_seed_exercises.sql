-- Catálogo inicial de exercícios (user_id nulo = visível para todos, somente leitura).
insert into public.exercises (user_id, name, category, description) values
  (null, 'Supino reto com barra',      'chest', 'Deitado no banco reto, desça a barra até a linha do peito e empurre até estender os braços.'),
  (null, 'Supino inclinado com halteres', 'chest', 'Banco a 30–45°. Desça os halteres ao lado do peito e empurre para cima, aproximando-os no topo.'),
  (null, 'Crucifixo com halteres',     'chest', 'Braços levemente flexionados, abra até sentir o alongamento do peito e feche em arco.'),
  (null, 'Crossover',                  'chest', 'Na polia alta, puxe as alças para baixo e à frente até as mãos se encontrarem.'),
  (null, 'Flexão de braço',            'chest', 'Corpo alinhado, desça o peito até perto do chão e empurre de volta.'),

  (null, 'Puxada frontal',             'back', 'Na polia alta, puxe a barra até a parte de cima do peito, levando os cotovelos para baixo.'),
  (null, 'Barra fixa',                 'back', 'Pendurado na barra, suba até o queixo passar da barra e desça controlando.'),
  (null, 'Remada curvada com barra',   'back', 'Tronco inclinado à frente, costas retas, puxe a barra em direção ao umbigo.'),
  (null, 'Remada baixa',               'back', 'Sentado na polia baixa, puxe o triângulo até o abdômen mantendo o peito aberto.'),
  (null, 'Remada unilateral',          'back', 'Apoiado no banco, puxe o halter ao lado do quadril, um braço por vez.'),
  (null, 'Levantamento terra',         'back', 'Barra no chão, costas neutras, estenda quadril e joelhos até ficar em pé.'),

  (null, 'Desenvolvimento com halteres', 'shoulders', 'Sentado, empurre os halteres da altura das orelhas até acima da cabeça.'),
  (null, 'Elevação lateral',           'shoulders', 'Eleve os halteres pelas laterais até a altura dos ombros, cotovelos levemente flexionados.'),
  (null, 'Elevação frontal',           'shoulders', 'Eleve o halter à frente do corpo até a altura dos ombros.'),
  (null, 'Crucifixo invertido',        'shoulders', 'Tronco inclinado, abra os braços para os lados trabalhando a parte de trás do ombro.'),

  (null, 'Rosca direta com barra',     'arms', 'Cotovelos junto ao corpo, flexione os braços levando a barra até os ombros.'),
  (null, 'Rosca martelo',              'arms', 'Pegada neutra (palmas para dentro), flexione os braços alternadamente.'),
  (null, 'Tríceps na polia (corda)',   'arms', 'Cotovelos fixos ao lado do corpo, estenda os braços abrindo a corda no final.'),
  (null, 'Tríceps testa',              'arms', 'Deitado, desça a barra em direção à testa flexionando só os cotovelos e estenda.'),
  (null, 'Mergulho no banco',          'arms', 'Mãos no banco atrás do corpo, desça flexionando os cotovelos e suba.'),

  (null, 'Agachamento livre',          'legs', 'Barra nas costas, desça o quadril até as coxas ficarem paralelas ao chão e suba.'),
  (null, 'Leg press 45°',              'legs', 'Empurre a plataforma estendendo as pernas sem travar os joelhos.'),
  (null, 'Cadeira extensora',          'legs', 'Sentado, estenda os joelhos elevando o apoio até as pernas ficarem retas.'),
  (null, 'Mesa flexora',               'legs', 'Deitado de bruços, flexione os joelhos trazendo o apoio em direção aos glúteos.'),
  (null, 'Stiff',                      'legs', 'Pernas quase estendidas, desça a barra rente às pernas inclinando o tronco e volte.'),
  (null, 'Afundo',                     'legs', 'Dê um passo à frente e desça até os dois joelhos formarem cerca de 90°.'),
  (null, 'Panturrilha em pé',          'legs', 'Na ponta dos pés, suba o máximo possível e desça alongando.'),

  (null, 'Elevação pélvica',           'glutes', 'Costas apoiadas no banco, barra no quadril, eleve o quadril contraindo os glúteos.'),
  (null, 'Cadeira abdutora',           'glutes', 'Sentado, afaste as pernas contra a resistência da máquina.'),
  (null, 'Glúteo na polia',            'glutes', 'Com a tornozeleira na polia baixa, leve a perna para trás estendendo o quadril.'),
  (null, 'Agachamento búlgaro',        'glutes', 'Pé de trás apoiado no banco, desça com a perna da frente e suba.'),

  (null, 'Prancha',                    'abs', 'Apoiado nos antebraços e pontas dos pés, mantenha o corpo alinhado pelo tempo definido.'),
  (null, 'Abdominal supra',            'abs', 'Deitado, joelhos flexionados, eleve o tronco contraindo o abdômen.'),
  (null, 'Abdominal infra',            'abs', 'Deitado, eleve as pernas em direção ao peito sem balançar.'),
  (null, 'Abdominal na polia',         'abs', 'Ajoelhado de frente para a polia alta, flexione o tronco puxando a corda.'),

  (null, 'Esteira',                    'cardio', 'Caminhada ou corrida na esteira.'),
  (null, 'Bicicleta ergométrica',      'cardio', 'Pedalada em ritmo constante ou em intervalos.'),
  (null, 'Elíptico',                   'cardio', 'Movimento contínuo de braços e pernas com baixo impacto.'),
  (null, 'Pular corda',                'cardio', 'Saltos contínuos com a corda.');
