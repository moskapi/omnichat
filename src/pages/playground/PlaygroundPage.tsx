import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, FlaskConical, Sparkles, BookOpen, Coins } from 'lucide-react';
import { PlaygroundResponse } from '@/types/api';
import { cn } from '@/lib/utils';

interface QueryResult {
  question: string;
  response: PlaygroundResponse;
  timestamp: Date;
}

export default function PlaygroundPage() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);

  const handleSubmit = async () => {
    if (!question.trim()) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockResponse: PlaygroundResponse = {
      answer:
        'Sim, oferecemos 14 dias de teste gratuito em todos os nossos planos! Durante o período de teste, você terá acesso completo a todas as funcionalidades do plano escolhido, sem precisar inserir dados de cartão de crédito. Após o término do período de teste, você pode optar por continuar com um plano pago ou sua conta será automaticamente convertida para o plano gratuito com recursos limitados.',
      sources: [
        {
          document_id: 'doc-1',
          filename: 'faq-atendimento.txt',
          chunk: '...oferecemos 14 dias de teste gratuito em todos os planos, sem necessidade de cartão de crédito...',
          score: 0.95,
        },
        {
          document_id: 'doc-2',
          filename: 'manual-produto.pdf',
          chunk: '...ao final do período de teste, a conta será convertida automaticamente para o plano gratuito...',
          score: 0.82,
        },
      ],
      tokens_used: 347,
      cost_usd: 0.0012,
    };

    setResults([
      {
        question,
        response: mockResponse,
        timestamp: new Date(),
      },
      ...results,
    ]);

    setQuestion('');
    setIsLoading(false);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Playground</h1>
        <p className="text-sm text-muted-foreground">
          Teste a IA e veja quais documentos são usados para responder
        </p>
      </div>

      {/* Input Area */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Textarea
              placeholder="Digite uma pergunta para testar a IA..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSubmit();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Ctrl + Enter para enviar</p>
              <Button onClick={handleSubmit} disabled={!question.trim() || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Testar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length === 0 ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center py-12">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4">
              <FlaskConical className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Faça uma pergunta</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Digite uma pergunta acima para ver como a IA responde usando sua base de conhecimento
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-4">
            {results.map((result, index) => (
              <Card key={index} className="animate-fade-up">
                <CardContent className="pt-6 space-y-4">
                  {/* Question */}
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted flex-shrink-0">
                      <span className="text-sm font-medium">?</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{result.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.timestamp.toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground whitespace-pre-wrap">{result.response.answer}</p>

                      {/* Sources */}
                      {result.response.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              Fontes utilizadas
                            </span>
                          </div>
                          <div className="space-y-2">
                            {result.response.sources.map((source, sourceIndex) => (
                              <div
                                key={sourceIndex}
                                className="p-3 rounded-lg bg-muted/50 border border-border"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-foreground">
                                    {source.filename}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {(source.score * 100).toFixed(0)}% match
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground italic">
                                  "{source.chunk}"
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tokens/Cost */}
                      {(result.response.tokens_used || result.response.cost_usd) && (
                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                          {result.response.tokens_used && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Sparkles className="w-3 h-3" />
                              <span>{result.response.tokens_used} tokens</span>
                            </div>
                          )}
                          {result.response.cost_usd && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Coins className="w-3 h-3" />
                              <span>${result.response.cost_usd.toFixed(4)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
