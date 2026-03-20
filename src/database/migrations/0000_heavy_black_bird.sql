CREATE TABLE "cep" (
	"id" text PRIMARY KEY NOT NULL,
	"cep" varchar(8) NOT NULL,
	"logradouro" varchar(255) NOT NULL,
	"complemento" text NOT NULL,
	"bairro" varchar(255) NOT NULL,
	"localidade" varchar(255) NOT NULL,
	"uf" varchar(2) NOT NULL,
	"ibge" varchar(7) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cep_idx" ON "cep" USING btree ("cep");