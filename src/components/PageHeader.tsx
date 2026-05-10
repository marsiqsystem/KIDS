import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  description?: string;
  tag?: string;
  backgroundImage?: string;
}

export default function PageHeader({ title, description, tag, backgroundImage }: PageHeaderProps) {
  return (
    <section 
      className={`relative py-24 md:py-32 overflow-hidden ${backgroundImage ? 'text-white' : 'bg-surface text-on-surface border-b border-outline-variant'}`}
      style={backgroundImage ? { backgroundImage: `url('${backgroundImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {backgroundImage && <div className="absolute inset-0 bg-primary/85 mix-blend-multiply" />}
      <div className="relative z-10 w-full px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl"
        >
          {tag && (
            <span className={`inline-block px-3 py-1 rounded font-semibold text-sm mb-6 ${backgroundImage ? 'bg-secondary text-on-secondary' : 'bg-secondary-container text-on-secondary-container'}`}>
              {tag}
            </span>
          )}
          <h1 className="font-serif text-5xl md:text-7xl mb-6">{title}</h1>
          {description && (
            <p className={`text-lg md:text-xl ${backgroundImage ? 'text-white/90' : 'text-on-surface-variant'}`}>
              {description}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
